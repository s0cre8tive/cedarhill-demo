import type { CollectionConfig } from 'payload'
import { isLoggedIn, isStaff, hiddenForVolunteers } from '../access'

/** Everyone who signed up for an event or a serve shift on the website. */
export const Signups: CollectionConfig = {
  slug: 'signups',
  labels: { singular: 'Sign-up', plural: 'Sign-ups' },
  admin: {
    hideAPIURL: true,
    group: 'Sundays',
    useAsTitle: 'name',
    defaultColumns: ['name', 'what', 'guests', 'reminderSent', 'createdAt'],
    hidden: hiddenForVolunteers,
    listSearchableFields: ['name', 'email', 'phone', 'what'],
    description: 'Event and serve sign-ups from the website. Reminders go out automatically the day before.',
  },
  defaultSort: '-createdAt',
  // Sign-ups only come in from the website.
  access: { read: isLoggedIn, create: () => false, update: isStaff, delete: isStaff },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, admin: { width: '34%' } },
        { name: 'email', label: 'Email', type: 'text', admin: { width: '33%' } },
        { name: 'phone', label: 'Phone', type: 'text', admin: { width: '33%' } },
      ],
    },
    { name: 'what', label: 'Signed up for', type: 'text', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'event', label: 'Event', type: 'relationship', relationTo: 'events', admin: { width: '50%' } },
        { name: 'slot', label: 'Serve shift', type: 'relationship', relationTo: 'serve-slots', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'guests', label: 'How many coming', type: 'number', defaultValue: 1, min: 1, admin: { width: '50%' } },
        { name: 'date', label: 'Date', type: 'date', admin: { width: '50%', readOnly: true, date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d' } } },
      ],
    },
    { name: 'person', label: 'Person in People', type: 'relationship', relationTo: 'people', admin: { position: 'sidebar' } },
    {
      name: 'reminderSent',
      label: 'Reminder sent',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Checked automatically the day before.' },
    },
  ],
}
