import type { CollectionConfig } from 'payload'
import { anyone, isLoggedIn, ministryOf, roleOf, staffOrOwnMinistry, isStaffField, hiddenForVolunteers } from '../access'
import { logCollection } from '../lib/changeLog'
import { teamCommOn } from '../lib/package'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'ministry', 'approval'],
    hidden: hiddenForVolunteers,
    description:
      'Upcoming events show on the homepage and disappear after they pass. Events added by ministry leaders wait for office approval.',
  },
  defaultSort: 'date',
  access: {
    read: anyone,
    create: isLoggedIn,
    update: staffOrOwnMinistry(),
    delete: staffOrOwnMinistry(),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation, originalDoc }) => {
        if (roleOf(req) === 'leader') {
          // Leaders can only post for their own ministry, and their changes need approval.
          data.ministry = ministryOf(req)
          data.approval = 'pending'
          if (operation === 'update') data.submittedBy = originalDoc?.submittedBy
        }
        if (operation === 'create') {
          const u = req.user as unknown as { name?: string } | null
          data.submittedBy = data.submittedBy || u?.name
        }
        return data
      },
    ],
    ...logCollection({
      area: 'Events',
      slug: 'events',
      title: (d) => String(d.title ?? ''),
      pending: (d) => d.approval === 'pending',
    }),
  },
  fields: [
    { name: 'title', label: 'Event name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          label: 'Date',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d, yyyy' }, width: '50%' },
        },
        { name: 'time', label: 'Time', type: 'text', admin: { placeholder: 'e.g. 6:00 PM', width: '50%' } },
      ],
    },
    { name: 'location', label: 'Where', type: 'text', defaultValue: 'Cedar Hill Church' },
    { name: 'details', label: 'A few words about it', type: 'textarea', admin: { description: 'One or two sentences.' } },
    {
      type: 'row',
      fields: [
        {
          name: 'signUp',
          label: 'Let people sign up on the website',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '50%', style: { alignSelf: 'flex-end' }, description: 'Adds a Sign up button. Everyone gets a reminder the day before.' },
        },
        {
          name: 'capacity',
          label: 'Spots available (optional)',
          type: 'number',
          min: 1,
          admin: { width: '50%', condition: (d) => Boolean(d?.signUp), description: 'Leave empty for no limit.' },
        },
      ],
    },
    {
      name: 'signups',
      label: 'Who signed up',
      type: 'join',
      collection: 'signups',
      on: 'event',
      admin: { condition: (d) => Boolean(d?.signUp), defaultColumns: ['name', 'guests', 'email', 'phone', 'createdAt'] },
    },
    { name: 'link', label: 'Outside info link (optional)', type: 'text', admin: { placeholder: 'https://' } },
    { name: 'flyer', label: 'Flyer or photo (optional)', type: 'upload', relationTo: 'media' },
    {
      name: 'approval',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'live',
      options: [
        { label: '✅ Live on the website', value: 'live' },
        { label: '🟡 Waiting for approval', value: 'pending' },
      ],
      access: { update: isStaffField },
      admin: {
        position: 'sidebar',
        isClearable: false,
        description: 'Office staff: switch to Live and Save to approve.',
      },
    },
    {
      name: 'ministry',
      label: 'Ministry',
      type: 'relationship',
      relationTo: 'ministries',
      admin: { position: 'sidebar', description: 'Leave empty for church-wide events.' },
      access: { update: isStaffField },
    },
    { name: 'submittedBy', label: 'Added by', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    // Cathedral: notes from the team, with @mentions.
    ...(teamCommOn()
      ? [{ name: 'teamComments', type: 'ui' as const, admin: { position: 'sidebar' as const, components: { Field: '@/components/admin/CommentPanel#CommentPanel' } } }]
      : []),
  ],
}
