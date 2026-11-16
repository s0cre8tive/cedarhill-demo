import { APIError, type Access, type CollectionConfig, type PayloadRequest } from 'payload'
import { hiddenForVolunteers, isLoggedIn, userOf } from '../access'
import { announcementWhereFor, audienceOf, cathedral, hiddenUnlessCathedral, idOf, idsOf, isTeamStaff, nameOf, notify, same, snippet, type Id } from '../lib/team'

const readAnnouncements: Access = async ({ req }) => {
  const user = userOf(req)
  if (!user) return false
  return announcementWhereFor(req.payload, user)
}
const own: Access = ({ req }) => {
  const user = userOf(req)
  return user ? { author: { equals: user.id } } : false
}
const ownOrAdmin: Access = ({ req }) => {
  const user = userOf(req)
  if (!user) return false
  return user.role === 'admin' ? true : { author: { equals: user.id } }
}

export const boardLink = (id: Id) => `/admin?a=${id}#team-board`

/** Loads an announcement the signed-in person is allowed to see, or null. */
async function visible(req: PayloadRequest) {
  const user = userOf(req)
  if (!user) return null
  try {
    return await req.payload.findByID({ collection: 'team-announcements', id: String(req.routeParams?.id), depth: 0, user: req.user, overrideAccess: false, req })
  } catch {
    return null
  }
}

/** Who has and hasn't pressed "Mark as read". */
export async function seenBy(req: PayloadRequest, a: { id: Id; audience?: string | null; campus?: unknown; teams?: unknown; author?: unknown }) {
  const { payload } = req
  const audience = await audienceOf(payload, a as never)
  const receipts = await payload.find({ collection: 'read-receipts', where: { announcement: { equals: a.id } }, limit: 5000, depth: 0, pagination: false, req })
  const read = new Set(receipts.docs.map((r) => String(idOf(r.user as never))))
  return { audience, read: audience.filter((id) => read.has(String(id))), unread: audience.filter((id) => !read.has(String(id))) }
}

/**
 * The staff notice board at the top of the dashboard (Cathedral).
 * Not the Announcement Banner: that one is the bar across the public website.
 */
export const TeamAnnouncements: CollectionConfig = {
  slug: 'team-announcements',
  labels: { singular: 'Team Announcement', plural: 'Team Announcements' },
  admin: {
    hideAPIURL: true,
    group: 'Team',
    useAsTitle: 'title',
    defaultColumns: ['title', 'audience', 'author', 'pinnedUntil', 'createdAt'],
    description:
      'Notes for your staff and volunteers. They show at the top of everyone’s dashboard, never on the public website. You can see who has read each one.',
    hidden: (args) => hiddenUnlessCathedral() || hiddenForVolunteers(args),
  },
  defaultSort: '-createdAt',
  access: {
    read: cathedral(readAnnouncements),
    // Pastor / Admin and Office post to everyone. A ministry leader can post to the teams they lead.
    create: cathedral(isLoggedIn),
    update: cathedral(own),
    delete: cathedral(ownOrAdmin),
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data
        const user = userOf(req)
        if (operation === 'create' && user) data.author = user.id
        if (operation === 'update') data.author = idOf(originalDoc?.author)
        const audience = data.audience ?? originalDoc?.audience ?? 'all'
        if (audience !== 'campus') data.campus = null
        if (audience !== 'teams') data.teams = []
        if (audience === 'campus' && !idOf(data.campus ?? originalDoc?.campus)) throw new APIError('Choose which campus this is for.', 400, undefined, true)
        const teams = idsOf(data.teams ?? originalDoc?.teams)
        if (audience === 'teams' && !teams.length) throw new APIError('Choose at least one team.', 400, undefined, true)
        // Only Pastor / Admin and Office can post to the whole church or a whole campus.
        if (user && !isTeamStaff(req) && !req.context?.seeding) {
          if (audience !== 'teams') throw new APIError('Only the pastor or church office can post to everyone. Choose “One or more teams” and pick your team.', 403, undefined, true)
          const led = await req.payload.find({ collection: 'teams', where: { leader: { equals: user.id } }, limit: 200, depth: 0, req })
          const ok = new Set(led.docs.map((t) => String(t.id)))
          if (!teams.every((t) => ok.has(String(t)))) throw new APIError('You can post announcements to the teams you lead.', 403, undefined, true)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const people = await audienceOf(req.payload, doc)
        await notify(
          req,
          people.map((recipient) => ({
            recipient,
            type: 'announcement' as const,
            title: `Team announcement: ${doc.title}`,
            body: snippet(doc.body, 300),
            link: boardLink(doc.id),
            from: nameOf(req),
          })),
        )
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await req.payload.delete({ collection: 'read-receipts', where: { announcement: { equals: doc.id } }, overrideAccess: true, req })
        await req.payload.delete({ collection: 'notifications', where: { link: { equals: boardLink(doc.id) } }, overrideAccess: true, req })
        return doc
      },
    ],
  },
  endpoints: [
    {
      // POST /api/team-announcements/:id/read — "Mark as read".
      path: '/:id/read',
      method: 'post',
      handler: async (req) => {
        const user = userOf(req)
        const a = await visible(req)
        if (!user || !a) return Response.json({ error: 'We couldn’t find that announcement.' }, { status: 404 })
        const had = await req.payload.count({ collection: 'read-receipts', where: { and: [{ user: { equals: user.id } }, { announcement: { equals: a.id } }] }, req })
        const now = new Date().toISOString()
        if (!had.totalDocs && !same(a.author as never, user.id)) {
          await req.payload.create({ collection: 'read-receipts', overrideAccess: true, req, data: { user: user.id, announcement: a.id, readAt: now } as never })
        }
        await req.payload.update({
          collection: 'notifications',
          where: { and: [{ recipient: { equals: user.id } }, { link: { equals: boardLink(a.id) } }, { readAt: { exists: false } }] },
          data: { readAt: now } as never,
          overrideAccess: true,
          req,
        })
        const s = await seenBy(req, a)
        return Response.json({ ok: true, seen: s.read.length, of: s.audience.length })
      },
    },
    {
      // GET /api/team-announcements/:id/seen — the author (or a Pastor / Admin) sees who has and hasn't read it.
      path: '/:id/seen',
      method: 'get',
      handler: async (req) => {
        const user = userOf(req)
        const a = await visible(req)
        if (!user || !a) return Response.json({ error: 'We couldn’t find that announcement.' }, { status: 404 })
        if (user.role !== 'admin' && !same(a.author as never, user.id)) return Response.json({ error: 'Only the person who posted it can see this list.' }, { status: 403 })
        const s = await seenBy(req, a)
        const users = await req.payload.find({ collection: 'users', where: { id: { in: s.audience.length ? s.audience : [0] } }, limit: 5000, depth: 0, pagination: false, overrideAccess: true, req })
        const name = new Map(users.docs.map((u) => [String(u.id), u.name || u.email]))
        const list = (ids: Id[]) => ids.map((id) => name.get(String(id)) ?? 'Someone').sort((x, y) => x.localeCompare(y))
        return Response.json({ read: list(s.read), unread: list(s.unread), reminded: a.reminderSentAt ?? null })
      },
    },
    {
      // POST /api/team-announcements/:id/remind — one reminder, to the people who haven't read it.
      path: '/:id/remind',
      method: 'post',
      handler: async (req) => {
        const user = userOf(req)
        const a = await visible(req)
        if (!user || !a) return Response.json({ error: 'We couldn’t find that announcement.' }, { status: 404 })
        if (user.role !== 'admin' && !same(a.author as never, user.id)) return Response.json({ error: 'Only the person who posted it can send the reminder.' }, { status: 403 })
        if (a.reminderSentAt) return Response.json({ error: 'A reminder has already gone out for this one.' }, { status: 409 })
        const s = await seenBy(req, a)
        if (!s.unread.length) return Response.json({ error: 'Everyone has read it. No reminder needed.' }, { status: 409 })
        const now = new Date().toISOString()
        await req.payload.update({ collection: 'team-announcements', id: a.id, data: { reminderSentAt: now } as never, overrideAccess: true, req, context: { skipNotify: true } })
        req.context.skipNotify = false
        await notify(
          req,
          s.unread.map((recipient) => ({
            recipient,
            type: 'reminder' as const,
            title: `Reminder: ${a.title}`,
            body: snippet(a.body, 300),
            link: boardLink(a.id),
            from: nameOf(req),
          })),
        )
        return Response.json({ ok: true, reminded: s.unread.length, at: now })
      },
    },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 120, admin: { placeholder: 'e.g. Christmas Eve service times are final' } },
    { name: 'body', label: 'What the team needs to know', type: 'textarea', maxLength: 1200, admin: { rows: 4, description: 'Keep it short. Two or three sentences.' } },
    {
      type: 'row',
      fields: [
        { name: 'link', label: 'Link (optional)', type: 'text', admin: { width: '50%', placeholder: 'https://' } },
        { name: 'attachment', label: 'Attachment (optional)', type: 'upload', relationTo: 'team-files', admin: { width: '50%', description: 'A photo or PDF.' } },
      ],
    },
    {
      name: 'audience',
      label: 'Who is this for?',
      type: 'select',
      required: true,
      defaultValue: 'all',
      options: [
        { label: 'Everyone on the team', value: 'all' },
        { label: 'One or more teams', value: 'teams' },
        { label: 'One campus (churches with more than one)', value: 'campus' },
      ],
      admin: { isClearable: false },
    },
    {
      name: 'teams',
      label: 'Which teams',
      type: 'relationship',
      relationTo: 'teams',
      hasMany: true,
      admin: { condition: (d) => d?.audience === 'teams' },
    },
    {
      name: 'campus',
      label: 'Which campus',
      type: 'relationship',
      relationTo: 'campuses',
      admin: { condition: (d) => d?.audience === 'campus' },
    },
    {
      name: 'pinnedUntil',
      label: 'Pin until (optional)',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE, MMM d' },
        description: 'Stays at the top of the board through this day.',
      },
    },
    { name: 'author', label: 'Posted by', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true, condition: (d) => Boolean(d?.author) } },
    { name: 'reminderSentAt', label: 'Reminder sent', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' }, condition: (d) => Boolean(d?.reminderSentAt) } },
  ],
}
