import type { Payload, TypedUser } from 'payload'
import React from 'react'

type Props = { payload: Payload; user?: TypedUser | null }
type U = { name?: string; role?: string; ministry?: unknown } | null

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date()),
  )
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const ICONS = {
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z',
  approve: 'M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  event: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  photo: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  people: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
}

const Ic = ({ d }: { d: string }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const Welcome = async ({ payload, user }: Props) => {
  const admin = payload.config.routes.admin
  const u = user as unknown as U
  const first = String(u?.name ?? '').split(' ')[0]
  const isLeader = u?.role === 'leader'
  const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  let newCount = 0
  let pending = 0
  let upcoming = 0
  let changes: Array<{ id: string | number; summary?: string | null; source?: string | null; status?: string | null; by?: string | null; createdAt: string; href?: string | null }> = []
  let myMinistry: { id: string | number; name: string } | null = null

  try {
    if (isLeader) {
      const mid = typeof u?.ministry === 'object' && u?.ministry ? (u.ministry as { id: string | number }).id : u?.ministry
      if (mid) {
        const m = await payload.findByID({ collection: 'ministries', id: mid as string, depth: 0 }).catch(() => null)
        if (m) myMinistry = { id: m.id, name: m.name }
        const [p, up] = await Promise.all([
          payload.count({ collection: 'events', where: { and: [{ ministry: { equals: mid } }, { approval: { equals: 'pending' } }] } }),
          payload.count({ collection: 'events', where: { and: [{ ministry: { equals: mid } }, { date: { greater_than_equal: today } }] } }),
        ])
        pending = p.totalDocs
        upcoming = up.totalDocs
      }
    } else {
      const [inbox, p, up, log] = await Promise.all([
        payload.count({ collection: 'inbox', where: { status: { equals: 'new' } }, user, overrideAccess: false }),
        payload.count({ collection: 'events', where: { approval: { equals: 'pending' } } }),
        payload.count({ collection: 'events', where: { and: [{ date: { greater_than_equal: today } }, { approval: { equals: 'live' } }] } }),
        payload.find({ collection: 'changes', sort: '-createdAt', limit: 6, depth: 0 }),
      ])
      newCount = inbox.totalDocs
      pending = p.totalDocs
      upcoming = up.totalDocs
      changes = log.docs as typeof changes
    }
  } catch {
    /* counts are a nice-to-have */
  }

  type Tile = { href: string; title: string; text: string; icon: string; badge?: number; tone?: 'violet' | 'coral' | 'green' }

  const tiles: Tile[] = isLeader
    ? [
        {
          href: `${admin}/collections/events/create`,
          title: `Add a ${myMinistry?.name ?? 'ministry'} event`,
          text: 'The office reviews it before it goes live',
          icon: ICONS.event,
          tone: 'violet',
        },
        {
          href: `${admin}/collections/events?where[approval][equals]=pending`,
          title: 'Waiting for approval',
          text: pending ? `${pending} of your events waiting` : 'Nothing waiting',
          icon: ICONS.approve,
          badge: pending,
        },
        {
          href: myMinistry ? `${admin}/collections/ministries/${myMinistry.id}` : `${admin}/collections/ministries`,
          title: 'Update my ministry',
          text: 'Meeting time, description and photo',
          icon: ICONS.people,
        },
        {
          href: `${admin}/collections/media/create`,
          title: 'Upload a photo',
          text: 'Use it on your events or ministry',
          icon: ICONS.photo,
        },
      ]
    : [
        {
          href: `${admin}/collections/inbox?where[status][equals]=new`,
          title: 'Check the inbox',
          text: newCount ? `${newCount} new ${newCount === 1 ? 'response' : 'responses'} waiting` : 'You’re all caught up',
          icon: ICONS.inbox,
          badge: newCount,
          tone: 'violet',
        },
        {
          href: `${admin}/collections/events?where[approval][equals]=pending`,
          title: 'Approve ministry posts',
          text: pending ? `${pending} waiting for you` : 'Nothing waiting',
          icon: ICONS.approve,
          badge: pending,
          tone: pending ? 'coral' : undefined,
        },
        {
          href: `${admin}/globals/church-info`,
          title: 'Update service times',
          text: 'Times, address, phone & giving link',
          icon: ICONS.clock,
        },
        {
          href: `${admin}/collections/events/create`,
          title: 'Add an event',
          text: upcoming ? `${upcoming} coming up on the site` : 'Nothing scheduled yet',
          icon: ICONS.event,
        },
        {
          href: `${admin}/collections/sermons/create`,
          title: 'Post a sermon',
          text: 'Paste the YouTube link',
          icon: ICONS.mic,
        },
        {
          href: `${admin}/globals/announcement`,
          title: 'Post an announcement',
          text: 'A banner across the top of the site',
          icon: ICONS.megaphone,
        },
        {
          href: `${admin}/collections/media/create`,
          title: 'Upload a photo',
          text: 'Choose where it shows',
          icon: ICONS.photo,
        },
        {
          href: `${admin}/collections/ministries`,
          title: 'Ministries',
          text: 'Times, leaders and photos',
          icon: ICONS.people,
        },
      ]

  return (
    <section className="ch-welcome">
      <div className="ch-welcome__head">
        <div>
          <p className="ch-kicker">{isLeader ? `${myMinistry?.name ?? 'Ministry'} · Leader view` : 'Cedar Hill Church · Website dashboard'}</p>
          <h1>
            {greeting()}
            {first ? `, ${first}` : ''}.
          </h1>
          <p className="ch-welcome__sub">What would you like to update today?</p>
        </div>
        <a className="ch-btn" href="/" target="_blank" rel="noopener">
          View the website ↗
        </a>
      </div>

      <div className="ch-tiles">
        {tiles.map((t) => (
          <a key={t.title} href={t.href} className={`ch-tile${t.tone ? ` ch-tile--${t.tone}` : ''}`}>
            <span className="ch-tile__ic">
              <Ic d={t.icon} />
              {t.badge ? <b className="ch-badge">{t.badge}</b> : null}
            </span>
            <strong>{t.title}</strong>
            <span>{t.text}</span>
          </a>
        ))}
      </div>

      {!isLeader && (
        <div className="ch-feed">
          <div className="ch-feed__top">
            <h2>Recent changes</h2>
            <div className="ch-feed__keys">
              <span className="ch-chip ch-chip--violet">Dashboard</span>
              <span className="ch-chip ch-chip--coral">Email · coming soon</span>
              <a href={`${admin}/collections/changes`}>See all →</a>
            </div>
          </div>
          {changes.length ? (
            changes.map((c) => (
              <a key={c.id} className="ch-feed__item" href={c.href || `${admin}/collections/changes/${c.id}`}>
                <span className={`ch-chip ${c.source === 'email' ? 'ch-chip--coral' : 'ch-chip--violet'}`}>
                  {c.source === 'email' ? 'Email' : c.source === 'system' ? 'System' : 'Dashboard'}
                </span>
                <span className="ch-feed__what">
                  {c.summary}
                  <small>
                    {c.by} · {ago(c.createdAt)}
                  </small>
                </span>
                <span className={`ch-chip ${c.status === 'pending' ? 'ch-chip--gold' : 'ch-chip--green'}`}>
                  {c.status === 'pending' ? 'Needs approval' : c.status === 'blocked' ? 'Blocked' : 'Live'}
                </span>
              </a>
            ))
          ) : (
            <p className="ch-feed__empty">Changes you make will show up here.</p>
          )}
        </div>
      )}

      <p className="ch-hint">
        Tip: changes show on the website as soon as you press <b>Save</b>
        {isLeader ? ' and the office approves them.' : '.'}
      </p>
    </section>
  )
}
