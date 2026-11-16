import type { CollectionConfig } from 'payload'
import { isAdmin, isSignedIn, userOf } from '../access'
import { cathedral } from '../lib/team'

/**
 * Attachments on team announcements and team posts (Cathedral).
 * Kept apart from Photos so nothing shared with the team ends up on the public website.
 */
export const TeamFiles: CollectionConfig = {
  slug: 'team-files',
  labels: { singular: 'Team attachment', plural: 'Team attachments' },
  admin: { hideAPIURL: true, group: 'Team', useAsTitle: 'filename', hidden: true },
  access: {
    read: cathedral(isSignedIn),
    create: cathedral(isSignedIn),
    update: cathedral(isAdmin),
    delete: cathedral(({ req }) => {
      const user = userOf(req)
      if (!user) return false
      return user.role === 'admin' ? true : { uploadedBy: { equals: user.id } }
    }),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user) data.uploadedBy = req.user.id
        return data
      },
    ],
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [{ name: 'uploadedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } }],
}
