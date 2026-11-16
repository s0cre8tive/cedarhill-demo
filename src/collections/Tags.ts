import type { CollectionConfig } from 'payload'
import { isLoggedIn, isStaff, hiddenForVolunteers } from '../access'

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  admin: {
    hideAPIURL: true,
    group: 'People',
    useAsTitle: 'name',
    hidden: hiddenForVolunteers,
    description: 'Groups for People, like Youth, Worship or Volunteer. Add as many as you like.',
  },
  defaultSort: 'name',
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isStaff },
  fields: [{ name: 'name', label: 'Tag name', type: 'text', required: true, unique: true }],
}
