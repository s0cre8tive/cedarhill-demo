import { APIError, type Access, type CollectionConfig } from 'payload'
import { isSignedIn, userOf } from '../access'
import { cathedral, findMentions, idOf, idsOf, isTeamStaff, myTeamIds, nameOf, notify, same, snippet, type Id } from '../lib/team'

const readPosts: Access = async ({ req }) => {
  if (!userOf(req)) return false
  if (isTeamStaff(req)) return true
  const ids = await myTeamIds(req)
  return ids.length ? { team: { in: ids } } : false
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

export const teamLink = (team: Id, post?: Id) => `/admin/teams/${team}${post != null ? `#post-${post}` : ''}`

/** Posts and replies in a team space (Cathedral). A calm message board, not live chat. */
export const TeamPosts: CollectionConfig = {
  slug: 'team-posts',
  labels: { singular: 'Team post', plural: 'Team posts' },
  admin: { hideAPIURL: true, group: 'Team', useAsTitle: 'body', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: cathedral(readPosts),
    // The hook below checks the person is on the team.
    create: cathedral(isSignedIn),
    update: cathedral(own),
    delete: cathedral(ownOrAdmin),
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data
        const user = userOf(req)
        if (operation === 'update') {
          // A post stays in its team and thread, with its author.
          data.team = idOf(originalDoc?.team)
          data.parent = idOf(originalDoc?.parent)
          data.author = idOf(originalDoc?.author)
          return data
        }
        if (user) data.author = user.id
        if (!data.parent && !idOf(data.team)) throw new APIError('Choose a team to post in.', 400, undefined, true)
        if (data.parent) {
          // Replies are one level deep: a reply to a reply joins the same thread.
          const parent = await req.payload.findByID({ collection: 'team-posts', id: idOf(data.parent) as Id, depth: 0, overrideAccess: true, req }).catch(() => null)
          if (!parent) throw new APIError('That post is no longer there.', 404, undefined, true)
          data.parent = idOf(parent.parent as never) ?? parent.id
          data.team = idOf(parent.team as never)
        }
        if (user && !isTeamStaff(req) && !req.context?.seeding) {
          const mine = await myTeamIds(req)
          if (!mine.some((t) => same(t, data.team))) throw new APIError('You can post in the teams you belong to.', 403, undefined, true)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || req.context?.skipNotify) return doc
        const { payload } = req
        const teamId = idOf(doc.team) as Id
        const me = idOf(doc.author)
        const top = idOf(doc.parent) ?? doc.id
        const link = teamLink(teamId, top)
        const team = await payload.findByID({ collection: 'teams', id: teamId, depth: 1, overrideAccess: true, req }).catch(() => null)
        const told = new Set<string>([String(me)])
        const notes: Parameters<typeof notify>[1] = []

        // Tagged teammates first.
        if (team) {
          const roster = [team.leader, ...((team.members ?? []) as unknown[])].filter(
            (u): u is { id: Id; name?: string } => Boolean(u && typeof u === 'object'),
          )
          for (const id of findMentions(String(doc.body ?? ''), roster)) {
            if (told.has(String(id))) continue
            told.add(String(id))
            notes.push({ recipient: id, type: 'mention', title: `${nameOf(req)} mentioned you in ${team.name}`, body: snippet(doc.body, 300), link, from: nameOf(req) })
          }
        }
        // Then everyone already in the thread.
        if (doc.parent) {
          const thread = await payload.find({
            collection: 'team-posts',
            where: { or: [{ id: { equals: top } }, { parent: { equals: top } }] },
            limit: 500,
            depth: 0,
            overrideAccess: true,
            req,
          })
          for (const id of idsOf(thread.docs.map((p) => p.author))) {
            if (told.has(String(id))) continue
            told.add(String(id))
            notes.push({ recipient: id, type: 'reply', title: `${nameOf(req)} replied in ${team?.name ?? 'your team'}`, body: snippet(doc.body, 300), link, from: nameOf(req) })
          }
        }
        await notify(req, notes)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Removing a post removes its replies.
        if (!doc.parent) await req.payload.delete({ collection: 'team-posts', where: { parent: { equals: doc.id } }, overrideAccess: true, req })
        return doc
      },
    ],
  },
  fields: [
    { name: 'team', type: 'relationship', relationTo: 'teams', index: true },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'body', type: 'textarea', required: true, maxLength: 4000 },
    { name: 'parent', type: 'relationship', relationTo: 'team-posts', index: true },
    { name: 'attachment', type: 'upload', relationTo: 'team-files' },
  ],
}
