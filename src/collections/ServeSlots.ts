import type { CollectionConfig } from 'payload'
import { anyone, isStaff } from '../access'
import { logCollection } from '../lib/changeLog'

export const SERVE_TEAMS = [
  { value: 'greeters', label: 'Greeters', blurb: 'Hold the door, hand out a smile and a bulletin.' },
  { value: 'coffee', label: 'Coffee & Hospitality', blurb: 'Brew the coffee and set out breakfast.' },
  { value: 'kids', label: 'Cedar Kids', blurb: 'Help a classroom leader during the 10:30 service.' },
  { value: 'tech', label: 'Worship & Tech', blurb: 'Run slides, sound or the live stream.' },
  { value: 'parking', label: 'Parking', blurb: 'Wave people in and help guests find a spot.' },
  { value: 'pantry', label: 'Neighbors Pantry', blurb: 'Pack and hand out groceries on Saturday.' },
] as const
export const teamLabel = (v?: string | null) => SERVE_TEAMS.find((t) => t.value === v)?.label ?? 'Serve'

/** One shift people can sign up for, e.g. "Greeters · Sun, Nov 15 · 10:00 AM · 4 spots". */
export const ServeSlots: CollectionConfig = {
  slug: 'serve-slots',
  labels: { singular: 'Serve shift', plural: 'Serve schedule' },
  admin: {
    hideAPIURL: true,
    group: 'Sundays',
    useAsTitle: 'label',
    defaultColumns: ['label', 'spots', 'updatedAt'],
    description: 'Shifts people can sign up for on the Serve page. Everyone gets a reminder the day before.',
  },
  defaultSort: 'date',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const d = data.date ? new Date(data.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''
        data.label = [teamLabel(data.team), d, data.time].filter(Boolean).join(' · ')
        return data
      },
    ],
    ...logCollection({ area: 'Serve', slug: 'serve-slots', title: (d) => String(d.label ?? '') }),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'team',
          label: 'Team',
          type: 'select',
          required: true,
          options: SERVE_TEAMS.map((t) => ({ label: t.label, value: t.value })),
          admin: { width: '50%' },
        },
        { name: 'spots', label: 'People needed', type: 'number', required: true, defaultValue: 2, min: 1, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'date', label: 'Date', type: 'date', required: true, admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d, yyyy' } } },
        { name: 'time', label: 'Time', type: 'text', admin: { width: '50%', placeholder: 'e.g. 10:00 – 11:45 AM' } },
      ],
    },
    { name: 'notes', label: 'Anything they should know (optional)', type: 'text', admin: { placeholder: 'e.g. Wear your Cedar Hill shirt' } },
    {
      name: 'signups',
      label: 'Who’s serving',
      type: 'join',
      collection: 'signups',
      on: 'slot',
      admin: { defaultColumns: ['name', 'email', 'phone', 'reminderSent'] },
    },
    { name: 'label', type: 'text', admin: { hidden: true } },
  ],
}
