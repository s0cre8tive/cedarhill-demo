import type { CollectionConfig } from 'payload'
import { anyone, isLoggedIn, isStaff } from '../access'
import { logCollection } from '../lib/changeLog'

export const PHOTO_SPOTS = [
  { label: 'Just storing it (ministry, event or leader photo)', value: 'library' },
  { label: 'Homepage header slideshow (newest 3 show)', value: 'hero' },
  { label: 'Homepage photo strip (newest 3 show)', value: 'gallery' },
  { label: '“Plan your visit” section', value: 'visit' },
  { label: 'Sermon artwork (when there’s no video thumbnail)', value: 'sermon' },
] as const

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: {
    hideAPIURL: true,
    group: 'Website',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'spot', 'updatedAt'],
    description:
      'Upload a photo and choose where it should show. The newest photo for each spot is the one people see.',
  },
  access: {
    read: anyone,
    // Ministry leaders can upload photos for their events; staff manage the rest.
    create: isLoggedIn,
    update: isStaff,
    delete: isStaff,
  },
  hooks: logCollection({
    area: 'Photos',
    slug: 'media',
    title: (d) => String(d.alt || d.filename || 'Photo'),
  }),
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'card', width: 900 },
      { name: 'large', width: 2000 },
    ],
    adminThumbnail: 'card',
  },
  fields: [
    {
      name: 'alt',
      label: 'Describe the photo',
      type: 'text',
      required: true,
      admin: {
        description:
          'One short sentence, e.g. "Volunteers packing groceries at the Saturday pantry." This helps people who use screen readers.',
      },
    },
    {
      name: 'spot',
      label: 'Where should this photo show?',
      type: 'select',
      required: true,
      defaultValue: 'library',
      options: PHOTO_SPOTS.map((s) => ({ label: s.label, value: s.value })),
      admin: { isClearable: false },
    },
    {
      name: 'caption',
      label: 'Caption (optional)',
      type: 'text',
      admin: {
        description: 'Shown on photo strip photos.',
        condition: (data) => data?.spot === 'gallery',
      },
    },
    {
      name: 'credit',
      label: 'Photo credit (optional)',
      type: 'text',
      admin: { description: 'e.g. "Photo: Jane Doe / Unsplash"', position: 'sidebar' },
    },
  ],
}
