import type { Access, Payload, PayloadRequest, Where } from 'payload'
import { roleOf, userOf } from '../access'
import { teamCommOn } from './package'

/**
 * Team Communication (Cathedral): shared helpers for team announcements, team spaces,
 * comments on records and notifications.
 */

export type Id = string | number
type Rel = Id | { id: Id } | null | undefined
export const idOf = (r: Rel): Id | null => (r && typeof r === 'object' ? r.id : (r ?? null))
export const idsOf = (list: unknown): Id[] =>
  (Array.isArray(list) ? list : []).map((r) => idOf(r as Rel)).filter((v): v is Id => v != null)
export const same = (a: Rel, b: Rel) => idOf(a) != null && String(idOf(a)) === String(idOf(b))

/** Wraps an access rule so it only passes on Cathedral. */
export const cathedral =
  (rule: Access): Access =>
  (args) =>
    teamCommOn() ? rule(args) : false

export const hiddenUnlessCathedral = () => !teamCommOn()

/** The teams a person leads or belongs to. */
export async function teamsOf(payload: Payload, userId: Id) {
  const res = await payload.find({
    collection: 'teams',
    where: { or: [{ leader: { equals: userId } }, { members: { in: [userId] } }] },
    limit: 200,
    depth: 0,
    sort: 'name',
  })
  return res.docs
}

/** Staff (Pastor / Admin and Office) see every team. Everyone else sees only their own. */
export const isTeamStaff = (req: PayloadRequest) => roleOf(req) === 'admin' || roleOf(req) === 'editor'

export async function myTeamIds(req: PayloadRequest): Promise<Id[]> {
  const user = userOf(req)
  if (!user) return []
  // Looked up once per request.
  const cached = req.context?.myTeamIds as Id[] | undefined
  if (cached) return cached
  const ids = (await teamsOf(req.payload, user.id)).map((t) => t.id)
  if (req.context) req.context.myTeamIds = ids
  return ids
}

/** Everyone who should see an announcement (never the author). */
export async function audienceOf(
  payload: Payload,
  a: { audience?: string | null; campus?: Rel; teams?: unknown; author?: Rel },
): Promise<Id[]> {
  const out = new Map<string, Id>()
  const add = (v: Rel) => {
    const id = idOf(v)
    if (id != null) out.set(String(id), id)
  }
  if (a.audience === 'teams' || a.audience === 'campus') {
    const where: Where =
      a.audience === 'teams' ? { id: { in: idsOf(a.teams).length ? idsOf(a.teams) : [0] } } : { campus: { equals: idOf(a.campus) ?? 0 } }
    const teams = await payload.find({ collection: 'teams', where, limit: 200, depth: 0 })
    for (const t of teams.docs) {
      add(t.leader as Rel)
      for (const m of idsOf(t.members)) add(m)
    }
  } else {
    const users = await payload.find({ collection: 'users', limit: 2000, depth: 0, pagination: false })
    for (const u of users.docs) add(u.id)
  }
  const author = idOf(a.author)
  if (author != null) out.delete(String(author))
  return [...out.values()]
}

/** "@Marcus" or "@Marcus Reed" in a message. Full names win, so two Marcuses don't both get tagged. */
export function findMentions(body: string, people: Array<{ id: Id; name?: string | null }>): Id[] {
  const text = ` ${body.toLowerCase()} `
  const hit = (needle: string) => new RegExp(`@${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`).test(text)
  const full = people.filter((p) => p.name && hit(p.name.toLowerCase().trim()))
  if (full.length) {
    const rest = people.filter((p) => !full.includes(p))
    const firsts = rest.filter((p) => {
      const first = String(p.name ?? '').trim().split(/\s+/)[0]?.toLowerCase()
      if (!first || !hit(first)) return false
      // "@Marcus Reed" already matched Marcus Reed; don't also tag another Marcus.
      return !full.some((f) => String(f.name).toLowerCase().startsWith(`${first} `))
    })
    return [...full, ...firsts].map((p) => p.id)
  }
  return people
    .filter((p) => {
      const first = String(p.name ?? '').trim().split(/\s+/)[0]?.toLowerCase()
      return Boolean(first) && hit(first)
    })
    .map((p) => p.id)
}

export const snippet = (s: unknown, n = 160) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

export type NotifyType = 'mention' | 'reply' | 'announcement' | 'reminder'
type Note = { recipient: Id; type: NotifyType; title: string; body?: string; link: string; from?: string }

/**
 * Adds one line to someone's "My notifications" and, if they asked for email right away, emails it.
 * People on the daily summary get it the next weekday morning instead.
 */
export async function notify(req: PayloadRequest, notes: Note[]) {
  if (!teamCommOn() || req.context?.skipNotify || !notes.length) return
  const { payload } = req
  await Promise.allSettled(
    notes.map(async (n) => {
      const doc = await payload.create({
        collection: 'notifications',
        overrideAccess: true,
        req,
        data: { recipient: n.recipient, type: n.type, title: n.title, body: n.body ?? '', link: n.link, from: n.from ?? '' } as never,
      })
      try {
        const user = await payload.findByID({ collection: 'users', id: n.recipient, depth: 0, overrideAccess: true, req })
        // Mentions, announcements and reminders are emailed. Replies wait in the dashboard and the daily summary.
        if (n.type === 'reply' || (user as { notify?: string }).notify !== 'instant') return
        const { sendNotificationEmail } = await import('./teamMail')
        const sent = await sendNotificationEmail(payload, user as never, n)
        if (sent) {
          await payload.update({ collection: 'notifications', id: doc.id, overrideAccess: true, req, data: { emailedAt: new Date().toISOString() } as never })
        }
      } catch (err) {
        payload.logger.error({ err, msg: 'Could not email a team notification' })
      }
    }),
  )
}

export const nameOf = (req: PayloadRequest) => {
  const u = userOf(req) as { name?: string; email?: string } | null
  return u?.name || u?.email || 'Someone'
}

/** The three kinds of records the team can leave notes on. */
export const COMMENTABLE = {
  events: { label: 'event', title: (d: Record<string, unknown>) => String(d.title ?? 'an event') },
  people: { label: 'guest', title: (d: Record<string, unknown>) => String(d.fullName || d.firstName || 'a guest') },
  sermons: { label: 'sermon', title: (d: Record<string, unknown>) => String(d.title ?? 'a sermon') },
} as const
export type Commentable = keyof typeof COMMENTABLE
export const isCommentable = (s: unknown): s is Commentable => typeof s === 'string' && s in COMMENTABLE

/** Which team announcements a person may see. Staff see all; everyone else sees church-wide ones and their teams'. */
export async function announcementWhereFor(payload: Payload, user: { id: Id; role?: string | null }): Promise<Where | true> {
  if (user.role === 'admin' || user.role === 'editor') return true
  const teams = await teamsOf(payload, user.id)
  const teamIds = teams.map((t) => t.id)
  const campusIds = [...new Set(teams.map((t) => idOf(t.campus as Rel)).filter((v): v is Id => v != null))]
  const or: Where[] = [{ audience: { equals: 'all' } }, { author: { equals: user.id } }]
  if (teamIds.length) or.push({ and: [{ audience: { equals: 'teams' } }, { teams: { in: teamIds } }] })
  if (campusIds.length) or.push({ and: [{ audience: { equals: 'campus' } }, { campus: { in: campusIds } }] })
  return { or }
}
