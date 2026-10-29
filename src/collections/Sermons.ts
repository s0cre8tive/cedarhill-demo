import type { CollectionConfig } from 'payload'
import { anyone, isStaff, hiddenForLeaders } from '../access'
import { logCollection } from '../lib/changeLog'

export const Sermons: CollectionConfig = {
  slug: 'sermons',
  labels: { singular: 'Sermon', plural: 'Sermons' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'preacher', 'date'],
    description: 'The newest sermon is featured on the homepage.',
    hidden: hiddenForLeaders,
  },
  defaultSort: '-date',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  hooks: logCollection({ area: 'Sermons', slug: 'sermons', title: (d) => String(d.title ?? '') }),
  fields: [
    { name: 'title', label: 'Sermon title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'preacher',
          label: 'Who preached',
          type: 'text',
          defaultValue: 'Pastor Renee Walker',
          admin: { width: '50%' },
        },
        {
          name: 'date',
          label: 'Date',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d, yyyy' }, width: '50%' },
        },
      ],
    },
    {
      name: 'video',
      label: 'Video link',
      type: 'text',
      admin: { placeholder: 'Paste the YouTube or Facebook link', description: 'Copy the link from YouTube or Facebook and paste it here.' },
    },
    { name: 'scripture', label: 'Scripture (optional)', type: 'text', admin: { placeholder: 'e.g. Isaiah 43:18–19' } },
    { name: 'summary', label: 'Short summary (optional)', type: 'textarea' },
  ],
}
