import type { Payload } from 'payload'
import { tagId } from './crm'
import { canEmail } from './emailList'

/** People who come regularly (second visit and beyond) but haven't been seen in three Sundays. */
export const CARE_STAGES = ['second-visit', 'connected', 'member']
export const CARE_DAYS = 20

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export async function missingPeople(payload: Payload) {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - CARE_DAYS)
  const res = await payload.find({
    collection: 'people',
    where: { and: [{ stage: { in: CARE_STAGES } }, { lastSeen: { exists: true } }, { lastSeen: { less_than: cutoff.toISOString() } }] },
    sort: 'lastSeen',
    limit: 100,
    depth: 0,
  })
  return res.docs.map((p) => ({
    id: p.id,
    name: p.fullName || p.firstName,
    firstName: p.firstName,
    lastSeen: p.lastSeen as string,
    weeks: Math.floor((Date.now() - new Date(p.lastSeen as string).getTime()) / (7 * 864e5)),
    assignedTo: p.assignedTo,
  }))
}

/** Gives each missing person one open "Check on…" follow-up and the Care alert tag. */
export async function scanCare(payload: Payload) {
  const missing = await missingPeople(payload)
  if (!missing.length) return { flagged: 0 }
  const office = await payload.find({ collection: 'users', where: { role: { in: ['editor', 'admin'] } }, sort: 'createdAt', limit: 1, depth: 0 })
  const care = await tagId(payload, 'Care alert')
  let flagged = 0
  for (const m of missing) {
    const open = await payload.count({
      collection: 'follow-ups',
      where: { and: [{ person: { equals: m.id } }, { done: { not_equals: true } }, { title: { like: 'Check on' } }] },
    })
    if (open.totalDocs) continue
    const person = await payload.findByID({ collection: 'people', id: m.id, depth: 0 })
    const tags = ((person.tags ?? []) as unknown[]).map((t) => (t && typeof t === 'object' ? (t as { id: string | number }).id : t))
    if (!tags.includes(care)) await payload.update({ collection: 'people', id: m.id, data: { tags: [...tags, care] } as never, context: { skipLog: true } })
    const a = m.assignedTo
    await payload.create({
      collection: 'follow-ups',
      context: { skipLog: true },
      data: {
        title: `Check on ${m.firstName}: last here ${fmt(m.lastSeen)}`,
        person: m.id,
        assignedTo: (a && typeof a === 'object' ? (a as { id: string | number }).id : a) ?? office.docs[0]?.id ?? null,
        due: new Date().toISOString(),
        notes: `${m.firstName} usually comes but hasn’t been here in ${m.weeks} weeks. A quick call or text to say “we miss you” goes a long way.`,
      } as never,
    })
    flagged++
  }
  if (flagged)
    await payload.create({
      collection: 'changes',
      context: { skipLog: true },
      data: {
        summary: `Care alert: ${flagged} ${flagged === 1 ? 'person hasn’t' : 'people haven’t'} been here in 3 weeks. Follow-ups added.`,
        area: 'Care',
        source: 'system',
        status: 'live',
        by: 'Cedar Hill',
        href: '/admin/collections/follow-ups?where[title][like]=Check on&where[done][not_equals]=true',
      } as never,
    })
  return { flagged }
}

/** The day-before reminder for event and serve sign-ups. */
export async function sendReminders(payload: Payload) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.now() + 864e5))
  const tomorrow = `${ymd}T12:00:00.000Z`
  const due = await payload.find({
    collection: 'signups',
    where: { and: [{ date: { equals: tomorrow } }, { reminderSent: { not_equals: true } }] },
    limit: 500,
    depth: 1,
  })
  if (!due.docs.length) return { due: 0, sent: 0 }
  const site = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
  let sent = 0
  for (const s of due.docs) {
    if (!canEmail() || !s.email) continue
    const first = String(s.name).split(' ')[0]
    const where =
      s.event && typeof s.event === 'object'
        ? [s.event.time, s.event.location].filter(Boolean).join(' · ')
        : s.slot && typeof s.slot === 'object'
          ? [s.slot.time, s.slot.notes].filter(Boolean).join(' · ')
          : ''
    try {
      await payload.sendEmail({
        to: s.email,
        subject: `Tomorrow: ${s.what}`,
        text: `Hi ${first},\n\nJust a reminder that you’re signed up for ${s.what} tomorrow${where ? ` (${where})` : ''}.\n\nThank you! We’re glad you’re coming.\nCedar Hill Church\n${site}`,
      })
      await payload.update({ collection: 'signups', id: s.id, data: { reminderSent: true } as never, context: { skipLog: true } })
      sent++
    } catch {
      /* try again tomorrow is too late; it's logged below */
    }
  }
  await payload.create({
    collection: 'changes',
    context: { skipLog: true },
    data: {
      summary: canEmail()
        ? `Reminders: ${sent} of ${due.docs.length} sent for tomorrow`
        : `${due.docs.length} sign-up ${due.docs.length === 1 ? 'reminder is' : 'reminders are'} ready for tomorrow. Connect email to send them automatically.`,
      area: 'Reminders',
      source: 'system',
      status: canEmail() && sent === due.docs.length ? 'live' : 'blocked',
      by: 'Cedar Hill',
      href: `/admin/collections/signups?where[date][equals]=${encodeURIComponent(tomorrow)}`,
    } as never,
  })
  return { due: due.docs.length, sent }
}
