import type { Payload, Where } from 'payload'
import { canEmail } from './emailList'
import { teamCommOn } from './package'
import { announcementWhereFor, idOf, snippet, type Id, type NotifyType } from './team'

/**
 * Team Communication emails (Cathedral): mentions and announcements right away,
 * the weekday summary, and the Thursday rundown. All sent through Resend, and every
 * one carries a link to the person's notification settings.
 */

const site = () => (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
const church = () => process.env.EMAIL_FROM_NAME || 'Cedar Hill Church'
export const settingsUrl = () => `${site()}/admin/account`
const abs = (link: string) => (/^https?:\/\//.test(link) ? link : `${site()}${link}`)

/** Demo logins use made-up addresses. Never send real email to them. */
export const deliverable = (email?: string | null) =>
  Boolean(email) && canEmail() && !/(\.demo|@example\.(com|org|net))$/i.test(String(email).trim())

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

type Section = { heading: string; items: Array<{ text: string; small?: string; link?: string }> }
type Mail = { to: string; subject: string; hello: string; intro?: string; sections?: Section[]; button?: { label: string; link: string } }

async function send(payload: Payload, m: Mail) {
  const foot = `You’re getting this because you’re on the ${church()} team. Change how often we email you: ${settingsUrl()}`
  const text = [
    m.hello,
    m.intro,
    ...(m.sections ?? []).flatMap((s) => [
      `${s.heading.toUpperCase()}`,
      ...s.items.map((i) => `• ${i.text}${i.small ? ` (${i.small})` : ''}${i.link ? `\n  ${abs(i.link)}` : ''}`),
    ]),
    m.button ? `${m.button.label}: ${abs(m.button.link)}` : null,
    foot,
  ]
    .filter(Boolean)
    .join('\n\n')
  const html = `<div style="background:#f3f0fb;padding:28px 12px;font-family:Figtree,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1633">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:28px 26px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b3fd9;font-weight:700">${esc(church())} · Team</p>
<p style="margin:0 0 12px;font-size:20px;font-weight:700;line-height:1.3">${esc(m.hello)}</p>
${m.intro ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;white-space:pre-line">${esc(m.intro)}</p>` : ''}
${(m.sections ?? [])
  .map(
    (s) => `<p style="margin:20px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#625b82;font-weight:700">${esc(s.heading)}</p>
${s.items
  .map(
    (i) =>
      `<p style="margin:0 0 8px;padding:10px 12px;background:#f8f6fd;border-radius:10px;font-size:14px;line-height:1.45">${
        i.link ? `<a href="${esc(abs(i.link))}" style="color:#1c1633;font-weight:600;text-decoration:none">${esc(i.text)}</a>` : `<b>${esc(i.text)}</b>`
      }${i.small ? `<br><span style="color:#625b82;font-size:13px">${esc(i.small)}</span>` : ''}</p>`,
  )
  .join('')}`,
  )
  .join('')}
${m.button ? `<p style="margin:22px 0 4px"><a href="${esc(abs(m.button.link))}" style="display:inline-block;background:#5b3fd9;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px">${esc(m.button.label)}</a></p>` : ''}
</div>
<p style="max-width:560px;margin:14px auto 0;font-size:12px;line-height:1.5;color:#625b82;text-align:center">You’re getting this because you’re on the ${esc(church())} team.<br><a href="${esc(settingsUrl())}" style="color:#5b3fd9">Change how often we email you</a></p>
</div>`
  await payload.sendEmail({ to: m.to, subject: m.subject, text, html })
}

type Person = { id: Id; name?: string | null; email?: string | null; notify?: string | null; role?: string | null }
const first = (p: Person) => String(p.name ?? '').trim().split(/\s+/)[0] || 'there'

const BUTTON: Record<NotifyType, string> = {
  mention: 'Open it and reply',
  reply: 'See the reply',
  announcement: 'Read it and mark as seen',
  reminder: 'Read it and mark as seen',
}

/** One email for one notification. Returns true if it went out. */
export async function sendNotificationEmail(
  payload: Payload,
  user: Person,
  n: { type: NotifyType; title: string; body?: string; link: string },
) {
  if (!teamCommOn() || !deliverable(user.email)) return false
  await send(payload, {
    to: String(user.email),
    subject: n.title,
    hello: `Hi ${first(user)},`,
    intro: [n.title, n.body ? `“${snippet(n.body, 400)}”` : ''].filter(Boolean).join('\n\n'),
    button: { label: BUTTON[n.type], link: n.link },
  })
  return true
}

const weekdayET = () => new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' }).format(new Date())
const TYPE_LABEL: Record<string, string> = { mention: 'Mentions', reply: 'Replies', announcement: 'Team announcements', reminder: 'Reminders' }

/** Weekday mornings: one summary for everyone who chose "once a day". */
export async function sendDailySummaries(payload: Payload, opts: { force?: boolean } = {}) {
  if (!teamCommOn()) return { skipped: 'Team Communication is a Cathedral feature.' }
  if (!opts.force && ['Sat', 'Sun'].includes(weekdayET())) return { skipped: 'Weekend' }
  const users = await payload.find({ collection: 'users', where: { notify: { equals: 'daily' } }, limit: 2000, depth: 0, pagination: false })
  let sent = 0
  for (const u of users.docs as unknown as Person[]) {
    if (!deliverable(u.email)) continue
    const waiting = await payload.find({
      collection: 'notifications',
      where: { and: [{ recipient: { equals: u.id } }, { readAt: { exists: false } }, { emailedAt: { exists: false } }] },
      sort: '-createdAt',
      limit: 50,
      depth: 0,
    })
    if (!waiting.docs.length) continue
    const sections: Section[] = Object.keys(TYPE_LABEL)
      .map((type) => ({
        heading: TYPE_LABEL[type],
        items: waiting.docs.filter((n) => n.type === type).map((n) => ({ text: n.title, small: snippet(n.body, 120) || undefined, link: n.link ?? '/admin' })),
      }))
      .filter((s) => s.items.length)
    try {
      await send(payload, {
        to: String(u.email),
        subject: `${waiting.docs.length} team ${waiting.docs.length === 1 ? 'update' : 'updates'} waiting on you`,
        hello: `Good morning, ${first(u)}.`,
        intro: 'Here’s what came in for you since yesterday.',
        sections,
        button: { label: 'Open My notifications', link: '/admin/notifications' },
      })
      const now = new Date().toISOString()
      for (const n of waiting.docs) await payload.update({ collection: 'notifications', id: n.id, data: { emailedAt: now } as never })
      sent++
    } catch (err) {
      payload.logger.error({ err, msg: `Daily team summary failed for user ${u.id}` })
    }
  }
  return { sent }
}

/** The coming Sunday (today, if it's Sunday) in Eastern time, as YYYY-MM-DD. */
export function comingSunday() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7))
  return d.toISOString().slice(0, 10)
}

/** What one person's Thursday rundown says. Also used to preview it in the dashboard. */
export async function rundownFor(payload: Payload, u: Person) {
  const sunday = comingSunday()
  const [events, where, receipts, waiting] = await Promise.all([
    payload.find({
      collection: 'events',
      where: {
        and: [
          { approval: { equals: 'live' } },
          { date: { greater_than_equal: `${sunday}T00:00:00.000Z` } },
          { date: { less_than_equal: `${sunday}T23:59:59.999Z` } },
        ],
      },
      sort: 'date',
      limit: 20,
      depth: 0,
    }),
    announcementWhereFor(payload, u),
    payload.find({ collection: 'read-receipts', where: { user: { equals: u.id } }, limit: 2000, depth: 0, pagination: false }),
    payload.find({
      collection: 'notifications',
      where: { and: [{ recipient: { equals: u.id } }, { readAt: { exists: false } }, { type: { in: ['mention', 'reply'] } }] },
      sort: '-createdAt',
      limit: 20,
      depth: 0,
    }),
  ])
  const seen = new Set(receipts.docs.map((r) => String(idOf(r.announcement as never))))
  const mine: Where = { author: { not_equals: u.id } }
  const anns = await payload.find({
    collection: 'team-announcements',
    where: where === true ? mine : { and: [where, mine] },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
  })
  const unread = anns.docs.filter((a) => !seen.has(String(a.id)))
  // Open follow-ups are part of "waiting on you" for people with back-office access.
  const tasks =
    u.role === 'volunteer'
      ? []
      : (
          await payload.find({
            collection: 'follow-ups',
            where: { and: [{ assignedTo: { equals: u.id } }, { done: { not_equals: true } }] },
            sort: 'due',
            limit: 10,
            depth: 0,
          })
        ).docs
  const sections: Section[] = [
    {
      heading: 'This Sunday',
      items: events.docs.map((e) => ({ text: e.title, small: [e.time, e.location].filter(Boolean).join(' · ') || undefined })),
    },
    {
      heading: 'Team announcements you haven’t read',
      items: unread.map((a) => ({ text: a.title, small: snippet(a.body, 120) || undefined, link: `/admin?a=${a.id}#team-board` })),
    },
    {
      heading: 'Waiting on you',
      items: [
        ...waiting.docs.map((n) => ({ text: n.title, small: snippet(n.body, 120) || undefined, link: n.link ?? '/admin/notifications' })),
        ...tasks.map((t) => ({ text: t.title, small: 'Follow-up', link: `/admin/collections/follow-ups/${t.id}` })),
      ],
    },
  ].filter((s) => s.items.length)
  return { sections, counts: { events: events.docs.length, unread: unread.length, waiting: waiting.docs.length + tasks.length } }
}

/** Thursday afternoon: this Sunday, unread announcements and anything waiting, for everyone on a team. */
export async function sendWeeklyRundown(payload: Payload, opts: { force?: boolean } = {}) {
  if (!teamCommOn()) return { skipped: 'Team Communication is a Cathedral feature.' }
  if (!opts.force && weekdayET() !== 'Thu') return { skipped: 'Not Thursday' }
  const [users, teams] = await Promise.all([
    payload.find({ collection: 'users', where: { notify: { not_equals: 'off' } }, limit: 2000, depth: 0, pagination: false }),
    payload.find({ collection: 'teams', limit: 500, depth: 0, pagination: false }),
  ])
  const onTeam = new Set<string>()
  for (const t of teams.docs) {
    const lead = idOf(t.leader as never)
    if (lead != null) onTeam.add(String(lead))
    for (const m of (t.members ?? []) as unknown[]) onTeam.add(String(idOf(m as never)))
  }
  let sent = 0
  let ready = 0
  for (const u of users.docs as unknown as Person[]) {
    if (u.role === 'volunteer' && !onTeam.has(String(u.id))) continue
    const { sections } = await rundownFor(payload, u)
    if (!sections.length) continue
    ready++
    if (!deliverable(u.email)) continue
    try {
      await send(payload, {
        to: String(u.email),
        subject: 'Your rundown for this Sunday',
        hello: `Hi ${first(u)}, here’s your week.`,
        intro: 'Everything in one place before Sunday.',
        sections,
        button: { label: 'Open the dashboard', link: '/admin' },
      })
      sent++
    } catch (err) {
      payload.logger.error({ err, msg: `Weekly rundown failed for user ${u.id}` })
    }
  }
  await payload.create({
    collection: 'changes',
    context: { skipLog: true },
    data: {
      summary: canEmail()
        ? `Weekly rundown: sent to ${sent} of ${ready} team members`
        : `Weekly rundown is ready for ${ready} team members. Connect email to send it automatically.`,
      area: 'Team',
      source: 'system',
      status: canEmail() ? 'live' : 'blocked',
      by: church(),
      href: '/admin/teams',
    } as never,
  })
  return { ready, sent }
}
