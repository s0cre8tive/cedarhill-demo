import type { Payload, TypedUser, Where } from 'payload'
import React from 'react'
import { ResetDemo } from './ResetDemo'
import { emailService } from '../../lib/emailList'
import { missingPeople } from '../../lib/care'
import { openServeShifts } from '../../lib/recap'
import { teamCommOn } from '../../lib/package'
import { TeamBoard } from './TeamBoard'

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
  board: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
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

  // Volunteers (Cathedral) get Team Communication and nothing else.
  if (u?.role === 'volunteer') {
    return (
      <section className="ch-welcome">
        <div className="ch-welcome__head">
          <div>
            <p className="ch-kicker">Cedar Hill Church · Team</p>
            <h1>
              {greeting()}
              {first ? `, ${first}` : ''}.
            </h1>
            <p className="ch-welcome__sub">Here’s what your team needs you to know.</p>
          </div>
          <a className="ch-btn" href={`${admin}/teams`}>
            Go to my teams
          </a>
        </div>
        {teamCommOn() && user ? (
          <TeamBoard payload={payload} user={user} />
        ) : (
          <p className="ch-team__empty">Team Communication isn’t turned on for this site. Ask the church office.</p>
        )}
        <p className="ch-hint">
          Tip: choose how often we email you under <a href={`${admin}/account`}>your account</a>.
        </p>
      </section>
    )
  }
  const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  let newCount = 0
  let pending = 0
  let upcoming = 0
  let changes: Array<{ id: string | number; summary?: string | null; source?: string | null; status?: string | null; by?: string | null; createdAt: string; href?: string | null }> = []
  let myMinistry: { id: string | number; name: string } | null = null
  let newGuests = 0
  let dueCount = 0
  let myTasks: Array<{ id: string | number; title: string; due?: string | null; person?: { id: string | number; fullName?: string | null } | null; late: boolean }> = []
  const meId = String((user as unknown as { id?: string | number } | null)?.id ?? '')
  const endOfToday = new Date(new Date().setHours(23, 59, 59, 999)).toISOString()

  try {
    const me = (user as unknown as { id?: string | number } | null)?.id
    if (me) {
      const mineOpen: { and: Where[] } = { and: [{ assignedTo: { equals: me } }, { done: { not_equals: true } }] }
      const [ng, due, list] = await Promise.all([
        payload.count({ collection: 'people', where: { stage: { equals: 'new-guest' } } }),
        payload.count({ collection: 'follow-ups', where: { and: [...mineOpen.and, { due: { less_than_equal: endOfToday } }] } }),
        payload.find({ collection: 'follow-ups', where: mineOpen, sort: 'due', limit: 5, depth: 1 }),
      ])
      newGuests = ng.totalDocs
      dueCount = due.totalDocs
      myTasks = list.docs.map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due as string | null,
        person: (t.person && typeof t.person === 'object' ? t.person : null) as { id: string | number; fullName?: string | null } | null,
        late: Boolean(t.due && String(t.due).slice(0, 10) < new Date().toISOString().slice(0, 10)),
      }))
    }
  } catch {
    /* nice-to-have */
  }

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

  // Sundays: check-in, care alerts, serving, the recap and connect cards.
  let hereCount = 0
  let careCount = 0
  let openSpots = 0
  let recap: { id: string | number; status?: string | null } | null = null
  let cardsWeek = 0
  if (!isLeader) {
    try {
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
      const sun = new Date(`${ymd}T12:00:00.000Z`)
      sun.setUTCDate(sun.getUTCDate() - sun.getUTCDay())
      const [here, missing, shifts, rc, cards] = await Promise.all([
        payload.count({ collection: 'attendance', where: { date: { equals: sun.toISOString() } } }),
        missingPeople(payload),
        openServeShifts(payload),
        payload.find({ collection: 'recaps', sort: '-weekOf', limit: 1, depth: 0 }),
        payload.count({ collection: 'inbox', where: { and: [{ formType: { equals: 'card' } }, { createdAt: { greater_than: new Date(Date.now() - 7 * 864e5).toISOString() } }] } }),
      ])
      hereCount = here.totalDocs
      careCount = missing.length
      openSpots = shifts.reduce((n, s) => n + s.open, 0)
      recap = rc.docs[0] ? { id: rc.docs[0].id, status: rc.docs[0].status } : null
      cardsWeek = cards.totalDocs
    } catch {
      /* nice-to-have */
    }
  }

  type Tile = { href: string; title: string; text: string; icon: string; badge?: number; tone?: 'violet' | 'coral' | 'green' }

  const crmTiles: Tile[] = [
    {
      href: `${admin}/pipeline`,
      title: 'People pipeline',
      text: newGuests ? `${newGuests} new ${newGuests === 1 ? 'guest' : 'guests'} to welcome` : 'See everyone by stage',
      icon: ICONS.board,
      badge: newGuests,
      tone: 'green',
    },
    {
      href: `${admin}/collections/follow-ups?where[done][not_equals]=true&where[assignedTo][equals]=${meId}&sort=due`,
      title: 'My follow-ups',
      text: dueCount ? `${dueCount} due today or overdue` : 'Nothing due today',
      icon: ICONS.check,
      badge: dueCount,
    },
  ]

  const sundayTiles: Tile[] = [
    {
      href: `${admin}/check-in`,
      title: 'Sunday check-in',
      text: hereCount ? `${hereCount} checked in last Sunday` : 'Tap people in as they arrive',
      icon: ICONS.check,
      tone: 'green',
    },
    {
      href: `${admin}/check-in`,
      title: 'Care alerts',
      text: careCount ? `${careCount} ${careCount === 1 ? 'person has' : 'people have'} missed 3 Sundays` : 'Everyone’s been around lately',
      icon: ICONS.people,
      badge: careCount,
      tone: careCount ? 'coral' : undefined,
    },
    {
      href: `${admin}/collections/serve-slots`,
      title: 'Serve schedule',
      text: openSpots ? `${openSpots} open ${openSpots === 1 ? 'spot' : 'spots'} this week` : 'Every shift is covered',
      icon: ICONS.event,
      badge: openSpots,
    },
    {
      href: recap ? `${admin}/collections/recaps/${recap.id}` : `${admin}/collections/recaps`,
      title: 'Sunday Recap',
      text: recap?.status === 'draft' ? 'This week’s draft is ready to send' : recap ? 'Sent · next draft Monday' : 'Drafted every Monday',
      icon: ICONS.megaphone,
      badge: recap?.status === 'draft' ? 1 : 0,
      tone: 'violet',
    },
    {
      href: `${admin}/connect-card`,
      title: 'Connect card QR',
      text: cardsWeek ? `${cardsWeek} ${cardsWeek === 1 ? 'card' : 'cards'} this week` : 'Print it or show it on screen',
      icon: ICONS.inbox,
    },
  ]

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

      {teamCommOn() && user && <TeamBoard payload={payload} user={user} />}

      {process.env.DEMO_RESET !== 'off' && u?.role !== 'admin' && (
        <div className="ch-tour">
          <p className="ch-tour__title">Demo tour · try these three things</p>
          <ol>
            {isLeader ? (
              <>
                <li>
                  <a href={`${admin}/collections/events/create`}>Add a Cedar Youth event</a> and press Save. It won’t go live
                  yet: it waits for the church office.
                </li>
                <li>
                  Open the <a href={`${admin}/pipeline`}>Pipeline board</a>, pick the <b>Youth</b> tag and move Devin to{' '}
                  <b>Second visit</b>.
                </li>
                <li>
                  <a href={`${admin}/logout`}>Sign out</a> and sign back in as Tasha (<code>office@cedarhill.demo</code>) to
                  approve your event.
                </li>
              </>
            ) : (
              <>
                <li>
                  <a href={`${admin}/globals/church-info`}>Change a service time</a>, press Save, then{' '}
                  <a href="/" target="_blank" rel="noopener">
                    view the website
                  </a>
                  . It’s already updated.
                </li>
                <li>
                  <a href={`${admin}/collections/events?where[approval][equals]=pending`}>Approve Marcus’s Youth Lock-In</a>.
                  Open it, switch Approval to Live and save. It appears under Coming up.
                </li>
                <li>
                  Fill out{' '}
                  <a href="/visit" target="_blank" rel="noopener">
                    Plan a visit
                  </a>{' '}
                  on the website, then find yourself on the <a href={`${admin}/pipeline`}>Pipeline board</a> with a follow-up
                  waiting.
                </li>
              </>
            )}
          </ol>
          <p className="ch-tour__fine">This is a shared demo. Everything resets every night.</p>
        </div>
      )}

      <div className="ch-tiles">
        {[...tiles.slice(0, 1), ...crmTiles, ...tiles.slice(1)].map((t) => (
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
        <>
          <h2 className="ch-tiles__h">Sundays &amp; care</h2>
          <div className="ch-tiles">
            {sundayTiles.map((t) => (
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
        </>
      )}

      {myTasks.length > 0 && (
        <div className="ch-feed ch-tasks">
          <div className="ch-feed__top">
            <h2>Your follow-ups</h2>
            <div className="ch-feed__keys">
              <a href={`${admin}/collections/follow-ups?where[done][not_equals]=true&where[assignedTo][equals]=${meId}&sort=due`}>See all →</a>
            </div>
          </div>
          {myTasks.map((t) => (
            <a key={t.id} className="ch-feed__item" href={`${admin}/collections/follow-ups/${t.id}`}>
              <span className={`ch-chip ${t.late ? 'ch-chip--coral' : 'ch-chip--violet'}`}>
                {t.due
                  ? t.late
                    ? 'Overdue'
                    : new Date(t.due).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
                  : 'No date'}
              </span>
              <span className="ch-feed__what">
                {t.title}
                {t.person?.fullName && <small>{t.person.fullName}</small>}
              </span>
              <span className="ch-chip ch-chip--green">Open</span>
            </a>
          ))}
        </div>
      )}

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
                <span className={`ch-chip ${c.status === 'pending' ? 'ch-chip--gold' : c.status === 'blocked' ? 'ch-chip--coral' : 'ch-chip--green'}`}>
                  {c.status === 'pending' ? 'Needs approval' : c.status === 'blocked' ? 'Blocked' : 'Live'}
                </span>
              </a>
            ))
          ) : (
            <p className="ch-feed__empty">Changes you make will show up here.</p>
          )}
        </div>
      )}

      {!isLeader && (
        <div className={`ch-mail${emailService() ? ' is-on' : ''}`}>
          <span className="ch-mail__dot" aria-hidden="true" />
          <p>
            {emailService() ? (
              <>
                <b>Email list connected to {emailService()}.</b> People who sign up on the website are added automatically.
              </>
            ) : (
              <>
                <b>Email list not connected yet.</b> Sign-ups are saved in People with the Email list tag. Connect Kit or
                Mailchimp to send them your weekly note.
              </>
            )}
          </p>
          <a className="ch-mail__link" href={`${admin}/pipeline`}>
            See sign-ups →
          </a>
        </div>
      )}

      {u?.role === 'admin' && process.env.DEMO_RESET !== 'off' && <ResetDemo />}

      <p className="ch-hint">
        Tip: changes show on the website as soon as you press <b>Save</b>
        {isLeader ? ' and the office approves them.' : '.'}
      </p>
    </section>
  )
}
