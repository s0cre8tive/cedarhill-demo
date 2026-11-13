import type { CollectionConfig, PayloadRequest } from 'payload'
import { isLoggedIn, isStaff } from '../access'

/** Keeps "Last at church" on each person current, so care alerts know who's been missing. */
async function refreshLastSeen(req: PayloadRequest, person: unknown) {
  const id = person && typeof person === 'object' ? (person as { id: string | number }).id : (person as string | number | null)
  if (id == null) return
  const latest = await req.payload.find({ collection: 'attendance', where: { person: { equals: id } }, sort: '-date', limit: 1, depth: 0, req })
  const skipLog = req.context?.skipLog
  await req.payload
    .update({ collection: 'people', id, data: { lastSeen: latest.docs[0]?.date ?? null } as never, req, context: { skipLog: true } })
    .catch(() => null)
  req.context.skipLog = skipLog
}

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  labels: { singular: 'Check-in', plural: 'Check-ins' },
  admin: {
    hideAPIURL: true,
    group: 'Sundays',
    useAsTitle: 'date',
    defaultColumns: ['person', 'date', 'how'],
    description: 'Who was at church each week. Use Sunday check-in in the menu to mark people present; connect cards check people in on their own.',
  },
  defaultSort: '-date',
  access: { read: isLoggedIn, create: isLoggedIn, update: isStaff, delete: isLoggedIn },
  hooks: {
    afterChange: [async ({ doc, req }) => (await refreshLastSeen(req, doc.person), doc)],
    afterDelete: [async ({ doc, req }) => (await refreshLastSeen(req, doc.person), doc)],
  },
  fields: [
    { name: 'person', label: 'Person', type: 'relationship', relationTo: 'people', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'date', label: 'Date', type: 'date', required: true, index: true, admin: { width: '50%', date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d, yyyy' } } },
        {
          name: 'how',
          label: 'How they checked in',
          type: 'select',
          defaultValue: 'staff',
          options: [
            { label: 'Staff check-in', value: 'staff' },
            { label: 'Connect card', value: 'card' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
  ],
}
