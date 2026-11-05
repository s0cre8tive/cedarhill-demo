import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'
import { logChange } from '../lib/changeLog'

/** "Call Sarah by Friday": small tasks tied to a person. */
export const FollowUps: CollectionConfig = {
  slug: 'follow-ups',
  labels: { singular: 'Follow-up', plural: 'Follow-ups' },
  admin: {
    hideAPIURL: true,
    group: 'People',
    useAsTitle: 'title',
    defaultColumns: ['title', 'person', 'assignedTo', 'due', 'done'],
    description: 'Calls, texts and visits to make. Open ones due today show on your dashboard.',
  },
  defaultSort: 'due',
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && doc.done && !previousDoc?.done) {
          await logChange(req, { area: 'Follow-ups', summary: `Done: ${doc.title}`, href: `/admin/collections/follow-ups/${doc.id}` })
        } else if (operation === 'create') {
          await logChange(req, { area: 'Follow-ups', summary: `Follow-up added: ${doc.title}`, href: `/admin/collections/follow-ups/${doc.id}` })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', label: 'What to do', type: 'text', required: true, admin: { placeholder: 'e.g. Call Sarah to say thanks for visiting' } },
    {
      type: 'row',
      fields: [
        { name: 'person', label: 'Person', type: 'relationship', relationTo: 'people', admin: { width: '50%' } },
        { name: 'assignedTo', label: 'Assigned to', type: 'relationship', relationTo: 'users', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'due',
          label: 'Due',
          type: 'date',
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d' } },
        },
        { name: 'done', label: 'Done', type: 'checkbox', defaultValue: false, admin: { width: '50%', style: { alignSelf: 'flex-end' } } },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}
