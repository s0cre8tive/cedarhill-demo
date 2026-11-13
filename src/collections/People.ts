import type { CollectionConfig, Where } from 'payload'
import { isLoggedIn, isStaff } from '../access'
import { logChange } from '../lib/changeLog'
import { STAGES, SOURCES, digits, stageLabel } from '../lib/crm'

/** Everyone the church is getting to know: guests, new believers, members. */
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: 'Person', plural: 'People' },
  admin: {
    hideAPIURL: true,
    group: 'People',
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'stage', 'tags', 'assignedTo', 'lastSeen'],
    listSearchableFields: ['fullName', 'email', 'phone'],
    description: 'Guests and members the church is following up with. Website forms add people here automatically.',
  },
  defaultSort: '-updatedAt',
  endpoints: [
    {
      // GET /api/people/export?tag=<id>&stage=<stage>: a spreadsheet-friendly list.
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Please sign in.' }, { status: 401 })
        const url = new URL(req.url || '', 'http://x')
        const tag = url.searchParams.get('tag')
        const stage = url.searchParams.get('stage')
        const where: Where = {
          and: [...(tag ? [{ tags: { in: [tag] } } as Where] : []), ...(stage ? [{ stage: { equals: stage } } as Where] : [])],
        }
        const res = await req.payload.find({ collection: 'people', where, limit: 5000, depth: 1, sort: 'lastName', user: req.user, overrideAccess: false })
        const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const name = (r: unknown) => (r && typeof r === 'object' ? (r as { name?: string }).name ?? '' : '')
        const rows = [
          ['First name', 'Last name', 'Email', 'Phone', 'Where they are', 'Tags', 'Following up', 'How we met', 'Added'],
          ...res.docs.map((p) => [
            p.firstName,
            p.lastName,
            p.email,
            p.phone,
            stageLabel(p.stage),
            ((p.tags ?? []) as unknown[]).map(name).filter(Boolean).join('; '),
            name(p.assignedTo),
            SOURCES.find((s) => s.value === p.source)?.label ?? '',
            new Date(p.createdAt).toLocaleDateString('en-US'),
          ]),
        ]
        let file = 'cedar-hill-people'
        if (tag) {
          const t = await req.payload.findByID({ collection: 'tags', id: tag, depth: 0 }).catch(() => null)
          if (t?.name) file += `-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        }
        return new Response(rows.map((r) => r.map(cell).join(',')).join('\r\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${file}.csv"`,
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  ],
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isStaff },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const first = String(data.firstName ?? '').trim()
        const last = String(data.lastName ?? '').trim()
        if ('firstName' in data || 'lastName' in data) data.fullName = [first, last].filter(Boolean).join(' ')
        if ('email' in data) data.email = String(data.email ?? '').trim().toLowerCase()
        if ('phone' in data) data.phoneDigits = digits(data.phone)
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const name = doc.fullName || 'Someone'
        let summary = operation === 'create' ? `${name} added to People` : `${name} updated in People`
        if (operation === 'update' && previousDoc?.stage !== doc.stage) summary = `${name} moved to ${stageLabel(doc.stage)}`
        await logChange(req, { area: 'People', summary, href: `/admin/collections/people/${doc.id}` })
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await logChange(req, { area: 'People', summary: `${doc.fullName || 'A person'} removed from People` })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', label: 'First name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'lastName', label: 'Last name', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', label: 'Email', type: 'email', admin: { width: '50%' } },
        { name: 'phone', label: 'Phone', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'stage',
          label: 'Where they are',
          type: 'select',
          required: true,
          defaultValue: 'new-guest',
          options: STAGES.map((s) => ({ label: s.label, value: s.value })),
          admin: { width: '50%', isClearable: false },
        },
        {
          name: 'assignedTo',
          label: 'Who’s following up',
          type: 'relationship',
          relationTo: 'users',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: { description: 'Type to find a tag, or add a new one under People → Tags.' },
    },
    {
      name: 'followUps',
      label: 'Follow-ups',
      type: 'join',
      collection: 'follow-ups',
      on: 'person',
      defaultSort: 'due',
      admin: { defaultColumns: ['title', 'due', 'assignedTo', 'done'] },
    },
    {
      name: 'responses',
      label: 'Website forms they sent',
      type: 'join',
      collection: 'inbox',
      on: 'person',
      admin: { defaultColumns: ['formType', 'status', 'createdAt'] },
    },
    {
      name: 'attendance',
      label: 'Sundays they were here',
      type: 'join',
      collection: 'attendance',
      on: 'person',
      defaultSort: '-date',
      admin: { defaultColumns: ['date', 'how'] },
    },
    {
      name: 'lastSeen',
      label: 'Last at church',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d' },
        description: 'Updated by check-ins and connect cards.',
      },
    },
    {
      name: 'source',
      label: 'How we met',
      type: 'select',
      options: SOURCES.map((s) => ({ label: s.label, value: s.value })),
      admin: { position: 'sidebar' },
    },
    { name: 'fullName', type: 'text', admin: { hidden: true } },
    { name: 'phoneDigits', type: 'text', index: true, admin: { hidden: true } },
  ],
}
