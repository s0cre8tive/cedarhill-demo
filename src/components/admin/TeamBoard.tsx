import type { Payload, TypedUser } from 'payload'
import React from 'react'
import { audienceOf, idOf, idsOf, teamsOf, type Id } from '../../lib/team'
import { TeamBoardClient, type BoardItem, type BoardNote } from './TeamBoardClient'

type Props = { payload: Payload; user: TypedUser }
type U = { id: Id; name?: string; role?: string }

/**
 * Top of the dashboard on Cathedral: the team announcement board with "My notifications" beside it.
 */
export async function TeamBoard({ payload, user }: Props) {
  const me = user as unknown as U
  const admin = payload.config.routes.admin
  const isStaff = me.role === 'admin' || me.role === 'editor'
  const today = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()

  try {
    const [anns, receipts, notes, unread, myTeams, campuses, allTeams] = await Promise.all([
      payload.find({ collection: 'team-announcements', sort: '-createdAt', limit: 40, depth: 1, user, overrideAccess: false }),
      payload.find({ collection: 'read-receipts', where: { user: { equals: me.id } }, limit: 2000, depth: 0, pagination: false }),
      payload.find({ collection: 'notifications', where: { recipient: { equals: me.id } }, sort: '-createdAt', limit: 6, depth: 0 }),
      payload.count({ collection: 'notifications', where: { and: [{ recipient: { equals: me.id } }, { readAt: { exists: false } }] } }),
      teamsOf(payload, me.id),
      payload.find({ collection: 'campuses', sort: 'name', limit: 100, depth: 0 }),
      payload.find({ collection: 'teams', limit: 500, depth: 0, pagination: false }),
    ])
    const seen = new Set(receipts.docs.map((r) => String(idOf(r.announcement as never))))
    const teamById = new Map(allTeams.docs.map((t) => [String(t.id), t]))
    const campusName = new Map(campuses.docs.map((c) => [String(c.id), c.name]))
    const leadsATeam = allTeams.docs.some((t) => String(idOf(t.leader as never)) === String(me.id))

    // Authors' names, looked up by the system so volunteers see who posted without seeing the staff list.
    const authorIds = [...new Set(anns.docs.map((a) => idOf(a.author as never)).filter((v): v is Id => v != null))]
    const authors = authorIds.length
      ? await payload.find({ collection: 'users', where: { id: { in: authorIds } }, limit: 500, depth: 0, pagination: false })
      : { docs: [] }
    const authorName = new Map(authors.docs.map((u) => [String(u.id), u.name || 'A teammate']))

    const pinned = (a: { pinnedUntil?: string | null }) => Boolean(a.pinnedUntil && a.pinnedUntil >= today)
    const sorted = [...anns.docs].sort((a, b) => Number(pinned(b)) - Number(pinned(a)) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8)

    const items: BoardItem[] = await Promise.all(
      sorted.map(async (a) => {
        const mine = String(idOf(a.author as never)) === String(me.id)
        const showCounts = isStaff || mine
        let seenCount = 0
        let of = 0
        if (showCounts) {
          const audience = await audienceOf(payload, a as never)
          of = audience.length
          if (of) {
            const got = await payload.find({ collection: 'read-receipts', where: { announcement: { equals: a.id } }, limit: 5000, depth: 0, pagination: false })
            const readers = new Set(got.docs.map((r) => String(idOf(r.user as never))))
            seenCount = audience.filter((id) => readers.has(String(id))).length
          }
        }
        const teams = idsOf(a.teams).map((t) => teamById.get(String(t))).filter(Boolean)
        const campusIds =
          a.audience === 'campus'
            ? [String(idOf(a.campus as never))]
            : a.audience === 'teams'
              ? teams.map((t) => String(idOf(t!.campus as never))).filter((c) => c !== 'null')
              : []
        const file = a.attachment && typeof a.attachment === 'object' ? (a.attachment as { url?: string | null; filename?: string | null }) : null
        return {
          id: String(a.id),
          title: a.title,
          body: a.body ?? '',
          link: a.link ?? '',
          file: file?.url ? { url: file.url, name: file.filename || 'Attachment' } : null,
          author: authorName.get(String(idOf(a.author as never))) ?? 'A teammate',
          createdAt: a.createdAt,
          pinned: pinned(a),
          audience:
            a.audience === 'all'
              ? 'Everyone'
              : a.audience === 'campus'
                ? `${campusName.get(String(idOf(a.campus as never))) ?? 'One'} campus`
                : teams.map((t) => t!.name).join(', ') || 'Teams',
          campusIds,
          mine,
          read: mine || seen.has(String(a.id)),
          showCounts,
          seen: seenCount,
          of,
          canManage: mine || me.role === 'admin',
          reminded: Boolean(a.reminderSentAt),
          editHref: mine ? `${admin}/collections/team-announcements/${a.id}` : '',
        }
      }),
    )

    const myNotes: BoardNote[] = notes.docs.map((n) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      body: n.body ?? '',
      link: n.link || `${admin}/notifications`,
      createdAt: n.createdAt,
      unread: !n.readAt,
    }))

    return (
      <TeamBoardClient
        admin={admin}
        items={items}
        notes={myNotes}
        unread={unread.totalDocs}
        teams={myTeams.map((t) => ({ id: String(t.id), name: t.name }))}
        // The campus filter only exists for churches with more than one campus.
        campuses={campuses.totalDocs > 1 ? campuses.docs.map((c) => ({ id: String(c.id), name: c.name })) : []}
        canPost={isStaff || (me.role === 'leader' && leadsATeam)}
        canSeeAll={me.role !== 'volunteer'}
      />
    )
  } catch (err) {
    payload.logger.error({ err, msg: 'Team board could not load' })
    return null
  }
}
