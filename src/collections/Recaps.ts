import type { CollectionConfig } from 'payload'
import { isStaff, hasBackOffice, hiddenForVolunteers } from '../access'
import { draftRecap, sendRecap } from '../lib/recap'
import { userOf } from '../access'

/** The Monday email: last Sunday's message, this week's events, serve needs and a note from the pastors. */
export const Recaps: CollectionConfig = {
  slug: 'recaps',
  labels: { singular: 'Sunday Recap', plural: 'Sunday Recaps' },
  admin: {
    hideAPIURL: true,
    group: 'Sundays',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'status', 'sentAt'],
    hidden: hiddenForVolunteers,
    description: 'A draft is ready every Monday morning. Add a note, press Preview, then Send.',
  },
  defaultSort: '-weekOf',
  access: {
    // Anyone can read a sent recap (it has a web page). Drafts are staff only.
    read: ({ req }) => (hasBackOffice(req.user) ? true : { status: { equals: 'sent' } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  endpoints: [
    {
      path: '/draft',
      method: 'post',
      handler: async (req) => {
        if (!hasBackOffice(req.user)) return Response.json({ error: 'Please sign in.' }, { status: 401 })
        const doc = await draftRecap(req.payload, { force: true })
        return Response.json({ id: doc.id })
      },
    },
    {
      path: '/:id/send',
      method: 'post',
      handler: async (req) => {
        const role = userOf(req)?.role
        if (role !== 'admin' && role !== 'editor') return Response.json({ error: 'Only staff can send the recap.' }, { status: 403 })
        try {
          const result = await sendRecap(req.payload, String(req.routeParams?.id), userOf(req)?.name || 'Staff')
          return Response.json(result)
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    { name: 'actions', type: 'ui', admin: { components: { Field: '@/components/admin/RecapActions#RecapActions' } } },
    { name: 'subject', label: 'Email subject', type: 'text', required: true },
    {
      name: 'pastorNote',
      label: 'A note from the pastors',
      type: 'textarea',
      admin: { rows: 5, description: 'Two or three sentences. This is the first thing people read.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'sermon', label: 'Last Sunday’s message', type: 'relationship', relationTo: 'sermons', admin: { width: '50%' } },
        {
          name: 'weekOf',
          label: 'Week of',
          type: 'date',
          required: true,
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d, yyyy' } },
        },
      ],
    },
    { name: 'events', label: 'Coming up this week', type: 'relationship', relationTo: 'events', hasMany: true },
    { name: 'announcement', label: 'Announcement', type: 'textarea', admin: { rows: 2 } },
    { name: 'showServe', label: 'Include serve shifts that still need people', type: 'checkbox', defaultValue: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: '📝 Draft', value: 'draft' },
        { label: '✅ Sent', value: 'sent' },
      ],
      admin: { position: 'sidebar', isClearable: false },
    },
    { name: 'sentAt', label: 'Sent', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'sentNote', label: 'Where it went', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  ],
}
