import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../access'

/** Read-only activity log: who changed what, and from which path. */
export const Changes: CollectionConfig = {
  slug: 'changes',
  labels: { singular: 'Change', plural: 'Recent Changes' },
  admin: {
    hideAPIURL: true,
    group: 'People',
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'source', 'status', 'by', 'createdAt'],
    description: 'Every change to the website, from the dashboard (and, soon, from email), in one place.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role === 'leader',
  },
  defaultSort: '-createdAt',
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    { name: 'summary', label: 'What changed', type: 'text', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'area', label: 'Where', type: 'text', admin: { readOnly: true, width: '25%' } },
        {
          name: 'source',
          label: 'How',
          type: 'select',
          options: [
            { label: 'Dashboard', value: 'dashboard' },
            { label: 'Email', value: 'email' },
            { label: 'System', value: 'system' },
          ],
          admin: { readOnly: true, width: '25%' },
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: '✅ Live', value: 'live' },
            { label: '🟡 Needs approval', value: 'pending' },
            { label: '⛔ Blocked', value: 'blocked' },
          ],
          admin: { readOnly: true, width: '25%' },
        },
        { name: 'by', label: 'By', type: 'text', admin: { readOnly: true, width: '25%' } },
      ],
    },
    { name: 'href', type: 'text', admin: { hidden: true } },
  ],
}
