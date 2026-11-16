import type { CollectionConfig } from 'payload'
import { isAdmin, userOf } from '../access'
import { cathedral } from '../lib/team'

/** Who has seen which team announcement. Written when someone presses "Mark as read". */
export const ReadReceipts: CollectionConfig = {
  slug: 'read-receipts',
  labels: { singular: 'Read receipt', plural: 'Read receipts' },
  admin: { hideAPIURL: true, group: 'Team', hidden: true },
  access: {
    read: cathedral(({ req }) => {
      const user = userOf(req)
      if (!user) return false
      return user.role === 'admin' ? true : { user: { equals: user.id } }
    }),
    // Only the "Mark as read" button writes these.
    create: () => false,
    update: () => false,
    delete: cathedral(isAdmin),
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'announcement', type: 'relationship', relationTo: 'team-announcements', index: true },
    { name: 'readAt', type: 'date', required: true },
  ],
}
