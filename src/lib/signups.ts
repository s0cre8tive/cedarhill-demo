import { createLocalReq, type Payload } from 'payload'
import { digits, findOrCreatePerson, serviceDay } from './crm'
import { canEmail } from './emailList'
import { logChange } from './changeLog'
import { teamLabel } from '../collections/ServeSlots'

/** The Eastern-time calendar day of a stored date, as noon UTC (what reminders look for). */
export const dayOf = (iso: string) => serviceDay(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(iso)))

export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })

const today = () => serviceDay()

/** How many spots are taken: guests for events, one per person for serve shifts. */
export async function taken(payload: Payload, kind: 'event' | 'serve', id: string | number) {
  const res = await payload.find({
    collection: 'signups',
    where: { [kind === 'event' ? 'event' : 'slot']: { equals: id } },
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  return kind === 'event' ? res.docs.reduce((n, s) => n + (s.guests ?? 1), 0) : res.docs.length
}

type Contact = { name: string; email: string; phone: string; guests: number }

export async function signUpFor(payload: Payload, kind: 'event' | 'serve', id: string, c: Contact) {
  let what = ''
  let date = ''
  let detail = ''
  let room = Infinity
  let target: string | number = id
  const field = kind === 'event' ? 'event' : 'slot'

  if (kind === 'event') {
    const e = await payload.findByID({ collection: 'events', id, depth: 0 }).catch(() => null)
    if (!e || e.approval !== 'live' || !e.signUp) return { ok: false as const, error: 'Sign-ups for this event are closed.' }
    if (dayOf(e.date) < today()) return { ok: false as const, error: 'This event has already happened.' }
    what = e.title
    target = e.id
    date = dayOf(e.date)
    detail = [fmtDay(e.date), e.time, e.location].filter(Boolean).join(' · ')
    if (e.capacity) room = e.capacity - (await taken(payload, 'event', e.id))
  } else {
    const s = await payload.findByID({ collection: 'serve-slots', id, depth: 0 }).catch(() => null)
    if (!s) return { ok: false as const, error: 'That shift isn’t on the schedule anymore.' }
    if (dayOf(s.date) < today()) return { ok: false as const, error: 'That shift has already happened.' }
    what = `${teamLabel(s.team)} team`
    target = s.id
    date = dayOf(s.date)
    detail = [fmtDay(s.date), s.time].filter(Boolean).join(' · ')
    room = (s.spots ?? 0) - (await taken(payload, 'serve', s.id))
  }

  // Signing up twice is fine: we keep the first one.
  const email = c.email.toLowerCase()
  const phone = digits(c.phone)
  const mine = await payload.find({ collection: 'signups', where: { [field]: { equals: target } }, limit: 1000, depth: 0, pagination: false })
  const dup = mine.docs.find((s) => (email && s.email?.toLowerCase() === email) || (phone && digits(s.phone) === phone))
  if (dup) return { ok: true as const, what: `${what}, ${detail}` }

  const need = kind === 'event' ? c.guests : 1
  if (room < need) return { ok: false as const, error: room > 0 ? `Only ${room} ${room === 1 ? 'spot is' : 'spots are'} left.` : 'This one is full. Thank you for wanting to come!' }

  const req = await createLocalReq({}, payload)
  const found = await findOrCreatePerson(req, { name: c.name, email: c.email, phone: c.phone }, {
    source: kind === 'event' ? 'event' : 'serve',
    tags: kind === 'serve' ? ['Volunteer'] : [],
    logAs: kind === 'event' ? `from the ${what} sign-up` : 'from the Serve page',
  })
  const doc = await payload.create({
    collection: 'signups',
    overrideAccess: true,
    context: { skipLog: true },
    data: {
      name: c.name,
      email: c.email,
      phone: c.phone,
      what: `${what} · ${detail}`,
      [field]: target,
      guests: kind === 'event' ? c.guests : 1,
      date,
      person: found?.person.id,
    } as never,
  })
  await logChange(req, {
    area: kind === 'event' ? 'Sign-ups' : 'Serve',
    summary: kind === 'event' ? `${c.name} signed up for ${what}${c.guests > 1 ? ` (${c.guests} people)` : ''}` : `${c.name} signed up to serve: ${what}, ${detail}`,
    source: 'system',
    href: `/admin/collections/signups/${doc.id}`,
  })

  // A confirmation now; the reminder goes out the day before.
  if (canEmail() && c.email) {
    const first = c.name.split(' ')[0]
    const site = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
    await payload
      .sendEmail({
        to: c.email,
        subject: `You’re signed up: ${what}`,
        text: `Hi ${first},\n\nYou’re signed up for ${what}: ${detail}.\nWe’ll send a reminder the day before.\n\nThank you!\nCedar Hill Church\n${site}`,
      })
      .catch(() => null)
  }
  return { ok: true as const, what: `${what}, ${detail}` }
}
