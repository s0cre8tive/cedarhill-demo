import type { CollectionConfig } from 'payload'
import { anyone, isStaff, hiddenForLeaders } from '../access'
import { logCollection } from '../lib/changeLog'

export const Leaders: CollectionConfig = {
  slug: 'leaders',
  labels: { singular: 'Leader', plural: 'Leaders' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'name',
    defaultColumns: ['name', 'title', 'order'],
    description: 'Shown in "Meet our pastors" on the homepage. No photo? A monogram shows instead.',
    hidden: hiddenForLeaders,
  },
  defaultSort: 'order',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  hooks: logCollection({ area: 'Leaders', slug: 'leaders', title: (d) => String(d.name ?? '') }),
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'title', label: 'Title', type: 'text', admin: { placeholder: 'e.g. Lead Pastor' } },
    { name: 'photo', label: 'Portrait', type: 'upload', relationTo: 'media' },
    { name: 'bio', label: 'Short bio', type: 'textarea', admin: { description: 'Two or three sentences.' } },
    {
      name: 'order',
      label: 'Order on the page',
      type: 'number',
      defaultValue: 1,
      admin: { position: 'sidebar', description: '1 shows first.' },
    },
  ],
}
