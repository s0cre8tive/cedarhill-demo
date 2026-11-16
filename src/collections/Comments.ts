import { APIError, type Access, type CollectionConfig } from 'payload'
import { hasBackOffice, isLoggedIn, userOf } from '../access'
import { cathedral, COMMENTABLE, findMentions, idOf, idsOf, isCommentable, nameOf, notify, snippet, type Id } from '../lib/team'

const own: Access = ({ req }) => {
  const user = userOf(req)
  return user && user.role !== 'volunteer' ? { author: { equals: user.id } } : false
}
const ownOrAdmin: Access = ({ req }) => {
  const user = userOf(req)
  if (!user || user.role === 'volunteer') return false
  return user.role === 'admin' ? true : { author: { equals: user.id } }
}

const keyOf = (slug: string, id: unknown) => `${slug}:${id}`
const recordLink = (slug: string, id: unknown) => `/admin/collections/${slug}/${id}`

/**
 * Notes the team leaves on an event, a guest or a sermon (Cathedral), with @mentions.
 * "@Marcus this family has two teens, can you reach out?"
 */
export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Comment', plural: 'Comments' },
  admin: { hideAPIURL: true, group: 'Team', useAsTitle: 'body', hidden: true },
  defaultSort: 'createdAt',
  access: { read: cathedral(isLoggedIn), create: cathedral(isLoggedIn), update: cathedral(own), delete: cathedral(ownOrAdmin) },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data
        const user = userOf(req)
        if (operation === 'update') {
          data.author = idOf(originalDoc?.author)
          data.relatedTo = originalDoc?.relatedTo
          data.recordKey = originalDoc?.recordKey
        } else {
          if (user) data.author = user.id
          const rel = data.relatedTo as { relationTo?: string; value?: unknown } | undefined
          const value = rel?.value && typeof rel.value === 'object' ? (rel.value as { id: Id }).id : rel?.value
          if (!rel || !isCommentable(rel.relationTo) || value == null) throw new APIError('Comments go on an event, a guest or a sermon.', 400, undefined, true)
          data.recordKey = keyOf(rel.relationTo, value)
        }
        // Work out who was tagged from the words themselves, so it can't be faked.
        const staff = await req.payload.find({ collection: 'users', where: { role: { not_equals: 'volunteer' } }, limit: 2000, depth: 0, pagination: false, overrideAccess: true, req })
        data.mentions = findMentions(String(data.body ?? originalDoc?.body ?? ''), staff.docs)
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || req.context?.skipNotify) return doc
        const [slug, id] = String(doc.recordKey).split(':')
        if (!isCommentable(slug)) return doc
        const record = await req.payload.findByID({ collection: slug, id, depth: 0, overrideAccess: true, req }).catch(() => null)
        const what = record ? COMMENTABLE[slug].title(record as unknown as Record<string, unknown>) : `this ${COMMENTABLE[slug].label}`
        const link = recordLink(slug, id)
        const me = String(idOf(doc.author))
        const told = new Set<string>([me])
        const notes: Parameters<typeof notify>[1] = []
        for (const m of idsOf(doc.mentions)) {
          if (told.has(String(m))) continue
          told.add(String(m))
          notes.push({ recipient: m, type: 'mention', title: `${nameOf(req)} mentioned you on ${what}`, body: snippet(doc.body, 300), link, from: nameOf(req) })
        }
        // Anyone already in the conversation hears about the reply.
        const earlier = await req.payload.find({ collection: 'comments', where: { recordKey: { equals: doc.recordKey } }, limit: 500, depth: 0, overrideAccess: true, req })
        for (const a of idsOf(earlier.docs.map((c) => c.author))) {
          if (told.has(String(a))) continue
          told.add(String(a))
          notes.push({ recipient: a, type: 'reply', title: `${nameOf(req)} replied on ${what}`, body: snippet(doc.body, 300), link, from: nameOf(req) })
        }
        await notify(req, notes)
        return doc
      },
    ],
  },
  endpoints: [
    {
      // GET /api/comments/thread?on=people&id=12 — the comments on one record, plus who can be @mentioned.
      path: '/thread',
      method: 'get',
      handler: async (req) => {
        const user = userOf(req)
        if (!user || !hasBackOffice(req.user)) return Response.json({ error: 'Please sign in.' }, { status: 401 })
        const url = new URL(req.url || '', 'http://x')
        const on = url.searchParams.get('on')
        const id = url.searchParams.get('id')
        if (!isCommentable(on) || !id) return Response.json({ error: 'Not found.' }, { status: 404 })
        const [comments, staff] = await Promise.all([
          req.payload.find({ collection: 'comments', where: { recordKey: { equals: keyOf(on, id) } }, sort: 'createdAt', limit: 300, depth: 0, user: req.user, overrideAccess: false, req }),
          req.payload.find({ collection: 'users', where: { role: { not_equals: 'volunteer' } }, sort: 'name', limit: 2000, depth: 0, pagination: false, overrideAccess: true, req }),
        ])
        const name = new Map(staff.docs.map((u) => [String(u.id), u.name || u.email]))
        return Response.json({
          me: String(user.id),
          canRemoveAny: user.role === 'admin',
          people: staff.docs.filter((u) => String(u.id) !== String(user.id)).map((u) => ({ id: String(u.id), name: u.name || u.email })),
          comments: comments.docs.map((c) => ({
            id: String(c.id),
            body: c.body,
            createdAt: c.createdAt,
            authorId: String(idOf(c.author as never)),
            author: name.get(String(idOf(c.author as never))) ?? 'A teammate',
            mentions: idsOf(c.mentions).map((m) => name.get(String(m))).filter(Boolean),
          })),
        })
      },
    },
  ],
  fields: [
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'mentions', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'relatedTo', type: 'relationship', relationTo: ['events', 'people', 'sermons'], required: true },
    // "people:12" — makes it quick to find every comment on one record.
    { name: 'recordKey', type: 'text', index: true },
  ],
}
