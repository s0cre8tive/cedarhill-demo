import type { CollectionConfig } from 'payload'
import { anyone, ministryOf, roleOf, staffOrOwnMinistry, isStaffField } from '../access'
import { logCollection } from '../lib/changeLog'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'ministry', 'approval'],
    description:
      'Upcoming events show on the homepage and disappear after they pass. Events added by ministry leaders wait for office approval.',
  },
  defaultSort: 'date',
  access: {
    read: anyone,
    create: ({ req }) => Boolean(roleOf(req)),
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
    { name: 'link', label: 'Sign-up or info link (optional)', type: 'text', admin: { placeholder: 'https://' } },
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
  ],
}
