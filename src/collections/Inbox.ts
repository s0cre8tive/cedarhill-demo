import type { Access, CollectionConfig, Where } from 'payload'
import { isAdmin, isStaff, hiddenForLeaders } from '../access'
import { linkResponseToPerson } from '../lib/crm'

export const FORM_TYPES = [
  { label: 'Plan a Visit', value: 'visit' },
  { label: 'New Member', value: 'member' },
  { label: 'Salvation', value: 'salvation' },
  { label: 'Prayer Request', value: 'prayer' },
] as const

/** Editors see everything except prayer requests marked "Pastors only". */
const readInbox: Access = ({ req }) => {
  const user = req.user as { role?: string } | null
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role !== 'editor') return false
  const where: Where = {
    or: [{ formType: { not_equals: 'prayer' } }, { visibility: { not_equals: 'pastors' } }],
  }
  return where
}

export const Inbox: CollectionConfig = {
  slug: 'inbox',
  labels: { singular: 'Form Response', plural: 'Inbox' },
  admin: {
    hideAPIURL: true,
    group: 'People',
    useAsTitle: 'name',
    defaultColumns: ['name', 'formType', 'status', 'createdAt'],
    description:
      'Everything people send from the website lands here. Mark each one as you follow up.',
    listSearchableFields: ['name', 'email', 'phone'],
    hidden: hiddenForLeaders,
  },
  defaultSort: '-createdAt',
  access: {
    read: readInbox,
    // Responses only come in from the website forms.
    create: () => false,
    update: isStaff,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [
      // New guests from the website go straight into People with a follow-up.
      async ({ doc, operation, req, context }) => {
        if (operation !== 'create' || context?.noCrm) return doc
        try {
          await linkResponseToPerson(req, doc)
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Could not add this response to People' })
        }
        return doc
      },
      async ({ doc, operation, req }) => {
        // Optional: email a notification when something new comes in.
        const to = process.env.NOTIFY_EMAIL
        if (operation !== 'create' || !to) return doc
        try {
          const type = FORM_TYPES.find((t) => t.value === doc.formType)?.label ?? 'Form'
          await req.payload.sendEmail({
            to,
            subject: `New ${type}: ${doc.name}`,
            text: `${doc.summary}\n\nOpen the inbox: ${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/admin/collections/inbox/${doc.id}`,
          })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Could not send inbox notification' })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          label: 'Follow-up status',
          type: 'select',
          required: true,
          defaultValue: 'new',
          options: [
            { label: '🟣 New', value: 'new' },
            { label: '🟡 Following up', value: 'following-up' },
            { label: '✅ Done', value: 'done' },
          ],
          admin: { width: '50%', isClearable: false },
        },
        {
          name: 'formType',
          label: 'Form',
          type: 'select',
          required: true,
          options: FORM_TYPES.map((t) => ({ label: t.label, value: t.value })),
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      name: 'person',
      label: 'Person in People',
      type: 'relationship',
      relationTo: 'people',
      admin: { position: 'sidebar', description: 'Added automatically for visit, membership and salvation forms.' },
    },
    {
      name: 'staffNotes',
      label: 'Notes for the team',
      type: 'textarea',
      admin: { description: 'Who reached out, when, and anything to remember.' },
    },
    {
      type: 'collapsible',
      label: 'What they sent',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Name', type: 'text', admin: { readOnly: true, width: '34%' } },
            { name: 'email', label: 'Email', type: 'text', admin: { readOnly: true, width: '33%' } },
            { name: 'phone', label: 'Phone', type: 'text', admin: { readOnly: true, width: '33%' } },
          ],
        },
        { name: 'summary', label: 'Their answers', type: 'textarea', admin: { readOnly: true, rows: 12 } },
        {
          name: 'visibility',
          label: 'Who may see this',
          type: 'select',
          defaultValue: 'team',
          options: [
            { label: 'Pastors only', value: 'pastors' },
            { label: 'Whole team', value: 'team' },
          ],
          admin: { readOnly: true },
        },
      ],
    },
  ],
}
