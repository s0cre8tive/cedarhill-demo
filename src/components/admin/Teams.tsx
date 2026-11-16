import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import React from 'react'
import { teamCommOn } from '../../lib/package'
import { idOf, idsOf, type Id } from '../../lib/team'
import { TeamSpace, type Post } from './TeamSpace'
import { ago, initials } from './teamUi'

type U = { id: Id; name?: string; role?: string }

/**
 * /admin/teams — the teams you belong to (staff see every team).
 * /admin/teams/:id — one team's space: posts with replies, and who's on the team.
 */
export async function Teams({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req
  const admin = payload.config.routes.admin
  const segments = ((params as { segments?: string[] } | undefined)?.segments ?? []) as string[]
  const teamId = segments[1]
  const here = `${admin}/teams${teamId ? `/${teamId}` : ''}`
  if (!user) redirect(`${admin}/login?redirect=${encodeURIComponent(here)}`)
  if (!teamCommOn()) redirect(admin)
  const me = user as unknown as U
  const isStaff = me.role === 'admin' || me.role === 'editor'

  const shell = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
      // Keeps the header bell (Cathedral) on this page too.
      viewActions={payload.config.admin?.components?.actions}
    >
      <div className="ch-pipe ch-teams">{children}</div>
    </DefaultTemplate>
  )

  // Names are looked up by the system, so volunteers see their teammates without seeing the staff list.
  const namesOf = async (ids: Id[]) => {
    const unique = [...new Map(ids.map((i) => [String(i), i])).values()]
    if (!unique.length) return new Map<string, string>()
    const res = await payload.find({ collection: 'users', where: { id: { in: unique } }, limit: 2000, depth: 0, pagination: false })
    return new Map(res.docs.map((u) => [String(u.id), u.name || 'A teammate']))
  }

  /* ---------- One team ---------- */
  if (teamId) {
    const team = await payload.findByID({ collection: 'teams', id: teamId, depth: 1, user, overrideAccess: false }).catch(() => null)
    if (!team) {
      return shell(
        <div className="ch-pipe__head">
          <div>
            <p className="ch-kicker">Teams</p>
            <h1>We couldn’t open that team</h1>
            <p className="ch-welcome__sub">
              You can see the teams you belong to. <a href={`${admin}/teams`}>Back to my teams</a>
            </p>
          </div>
        </div>,
      )
    }
    // Opening the team space clears its mentions and replies from My notifications.
    await payload.update({
      collection: 'notifications',
      where: { and: [{ recipient: { equals: me.id } }, { readAt: { exists: false } }, { link: { like: `${admin}/teams/${team.id}#` } }] },
      data: { readAt: new Date().toISOString() } as never,
    })

    const [tops, replies] = await Promise.all([
      payload.find({ collection: 'team-posts', where: { and: [{ team: { equals: team.id } }, { parent: { exists: false } }] }, sort: '-createdAt', limit: 30, depth: 1 }),
      payload.find({ collection: 'team-posts', where: { and: [{ team: { equals: team.id } }, { parent: { exists: true } }] }, sort: 'createdAt', limit: 1000, depth: 1, pagination: false }),
    ])
    const leaderId = idOf(team.leader as never)
    const memberIds = idsOf(team.members)
    const names = await namesOf([...(leaderId != null ? [leaderId] : []), ...memberIds, ...idsOf([...tops.docs, ...replies.docs].map((p) => p.author))])
    const toPost = (p: (typeof tops.docs)[number]): Post => {
      const file = p.attachment && typeof p.attachment === 'object' ? (p.attachment as { url?: string | null; filename?: string | null }) : null
      const author = String(idOf(p.author as never))
      return {
        id: String(p.id),
        body: p.body,
        author: names.get(author) ?? 'A teammate',
        mine: author === String(me.id),
        createdAt: p.createdAt,
        file: file?.url ? { url: file.url, name: file.filename || 'Attachment' } : null,
        replies: [],
      }
    }
    const byTop = new Map<string, Post[]>()
    for (const r of replies.docs) {
      const k = String(idOf(r.parent as never))
      byTop.set(k, [...(byTop.get(k) ?? []), toPost(r)])
    }
    const posts = tops.docs.map((p) => ({ ...toPost(p), replies: byTop.get(String(p.id)) ?? [] }))
    const roster = [
      ...(leaderId != null ? [{ id: String(leaderId), name: names.get(String(leaderId)) ?? 'Team leader', leader: true }] : []),
      ...memberIds
        .filter((m) => String(m) !== String(leaderId))
        .map((m) => ({ id: String(m), name: names.get(String(m)) ?? 'A teammate', leader: false }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ]
    const campus = team.campus && typeof team.campus === 'object' ? (team.campus as { name?: string }).name : null

    return shell(
      <>
        <div className="ch-pipe__head">
          <div>
            <p className="ch-kicker">
              <a href={`${admin}/teams`}>Teams</a> · {campus ? `${campus} campus` : 'Team space'}
            </p>
            <h1>{team.name}</h1>
            {team.description && <p className="ch-welcome__sub">{team.description}</p>}
          </div>
          {isStaff && (
            <a className="ch-btn" href={`${admin}/collections/teams/${team.id}`}>
              Manage this team
            </a>
          )}
        </div>
        <div className="ch-space">
          <TeamSpace teamId={String(team.id)} teamName={team.name} posts={posts} canRemoveAny={me.role === 'admin'} mentionable={roster.filter((r) => r.id !== String(me.id)).map((r) => r.name)} />
          <aside className="ch-space__side">
            <h2>On this team ({roster.length})</h2>
            <ul className="ch-roster">
              {roster.map((r) => (
                <li key={r.id}>
                  <span className="ch-avatar" aria-hidden="true">
                    {initials(r.name)}
                  </span>
                  <span>
                    {r.name}
                    {r.leader && <small>Team leader</small>}
                  </span>
                </li>
              ))}
            </ul>
            {!roster.length && <p className="ch-team__empty">No one has been added yet.</p>}
          </aside>
        </div>
      </>,
    )
  }

  /* ---------- My teams ---------- */
  const [teams, campuses] = await Promise.all([
    payload.find({ collection: 'teams', sort: 'name', limit: 300, depth: 1, user, overrideAccess: false }),
    payload.find({ collection: 'campuses', sort: 'name', limit: 100, depth: 0 }),
  ])
  const multi = campuses.totalDocs > 1
  const campus = multi ? String((searchParams as Record<string, string | undefined>)?.campus ?? '') : ''
  const latest = await payload.find({ collection: 'team-posts', sort: '-createdAt', limit: 300, depth: 0 })
  const lastPost = new Map<string, string>()
  for (const p of latest.docs) {
    const k = String(idOf(p.team as never))
    if (!lastPost.has(k)) lastPost.set(k, p.createdAt)
  }
  const leaderNames = await namesOf(teams.docs.map((t) => idOf(t.leader as never)).filter((v): v is Id => v != null))
  const cards = teams.docs
    .filter((t) => !campus || String(idOf(t.campus as never)) === campus)
    .map((t) => {
      const leader = idOf(t.leader as never)
      const members = idsOf(t.members)
      const mine = String(leader) === String(me.id) || members.some((m) => String(m) === String(me.id))
      const count = new Set([...(leader != null ? [String(leader)] : []), ...members.map(String)]).size
      return {
        id: String(t.id),
        name: t.name,
        description: t.description ?? '',
        leader: leader != null ? (leaderNames.get(String(leader)) ?? '') : '',
        count,
        mine,
        campus: t.campus && typeof t.campus === 'object' ? ((t.campus as { name?: string }).name ?? '') : '',
        last: lastPost.get(String(t.id)) ?? null,
      }
    })
  const mine = cards.filter((c) => c.mine)
  const others = cards.filter((c) => !c.mine)

  const grid = (list: typeof cards) => (
    <div className="ch-teamgrid">
      {list.map((t) => (
        <a key={t.id} className="ch-teamcard" href={`${admin}/teams/${t.id}`}>
          <strong>{t.name}</strong>
          {t.description && <span>{t.description}</span>}
          <small>
            {t.count} {t.count === 1 ? 'person' : 'people'}
            {t.leader ? ` · Led by ${t.leader}` : ''}
            {multi && t.campus ? ` · ${t.campus}` : ''}
          </small>
          <small className="ch-teamcard__last">{t.last ? `Last post ${ago(t.last)}` : 'No posts yet'}</small>
        </a>
      ))}
    </div>
  )

  return shell(
    <>
      <div className="ch-pipe__head">
        <div>
          <p className="ch-kicker">Team</p>
          <h1>{isStaff ? 'Teams' : 'My teams'}</h1>
          <p className="ch-welcome__sub">Each team has its own space for posts and replies. Open one to post to your team.</p>
        </div>
        {isStaff && (
          <a className="ch-btn" href={`${admin}/collections/teams`}>
            Manage teams
          </a>
        )}
      </div>
      {multi && (
        <div className="ch-campus">
          <span>Campus</span>
          <a className={campus ? '' : 'is-on'} href={`${admin}/teams`}>
            All
          </a>
          {campuses.docs.map((c) => (
            <a key={c.id} className={campus === String(c.id) ? 'is-on' : ''} href={`${admin}/teams?campus=${c.id}`}>
              {c.name}
            </a>
          ))}
        </div>
      )}
      {mine.length > 0 && (
        <>
          {isStaff && <h2 className="ch-tiles__h">My teams</h2>}
          {grid(mine)}
        </>
      )}
      {isStaff && others.length > 0 && (
        <>
          <h2 className="ch-tiles__h">{mine.length ? 'Other teams' : 'All teams'}</h2>
          {grid(others)}
        </>
      )}
      {!cards.length && (
        <p className="ch-team__empty">
          {isStaff ? 'No teams yet. Press “Manage teams” to add your first one.' : 'You haven’t been added to a team yet. Ask the church office to add you.'}
        </p>
      )}
    </>,
  )
}
