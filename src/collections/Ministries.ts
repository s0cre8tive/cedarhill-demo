import type { CollectionConfig } from 'payload'
import { anyone, isStaff, isStaffField, staffOrOwnMinistry } from '../access'
import { logCollection } from '../lib/changeLog'

export const Ministries: CollectionConfig = {
  slug: 'ministries',
  labels: { singular: 'Ministry', plural: 'Ministries' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'name',
    defaultColumns: ['name', 'meets', 'leaderName', 'order'],
    description: 'The ministries shown in "Find your people" on the homepage.',
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: isStaff,
    // Ministry leaders can update their own ministry's details.
    update: staffOrOwnMinistry('id'),
    delete: isStaff,
  },
  hooks: logCollection({ area: 'Ministries', slug: 'ministries', title: (d) => String(d.name ?? '') }),
  fields: [
    { name: 'name', label: 'Ministry name', type: 'text', required: true, access: { update: isStaffField } },
    { name: 'tagline', label: 'One-line description', type: 'text', admin: { placeholder: 'e.g. Ages 11–18 · real talk, real faith' } },
    { name: 'meets', label: 'When it meets', type: 'text', admin: { placeholder: 'e.g. Wednesdays · 7:00 PM' } },
    { name: 'about', label: 'A few sentences about it', type: 'textarea' },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'leaderName', label: 'Who leads it', type: 'text' },
    {
      name: 'order',
      label: 'Order on the page',
      type: 'number',
      defaultValue: 1,
      admin: { position: 'sidebar', description: '1 shows first.' },
      access: { update: isStaffField },
    },
  ],
}
