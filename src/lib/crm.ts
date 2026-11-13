import type { Payload, PayloadRequest, Where } from 'payload'
import { logChange } from './changeLog'

export { STAGES, SOURCES, stageLabel, type Stage } from './stages'

export const digits = (s?: string | null) => String(s ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')

/** Finds a tag by name, creating it if needed. */
export async function tagId(payload: Payload, name: string, req?: PayloadRequest) {
  const found = await payload.find({ collection: 'tags', where: { name: { equals: name } }, limit: 1, depth: 0, req })
  if (found.docs[0]) return found.docs[0].id
  const doc = await payload.create({ collection: 'tags', data: { name }, req, context: { skipLog: true } })
  return doc.id
}

const FORM_FOLLOW_UP: Record<string, { tag?: string; task?: (first: string) => string }> = {
  visit: { task: (f) => `Welcome ${f}: call or text before Sunday` },
  member: { tag: 'Membership class', task: (f) => `Invite ${f} to the next membership class` },
  salvation: { tag: 'New believer', task: (f) => `Reach out to ${f} about next steps` },
  // Email sign-ups just join the list; no call needed.
  connect: { tag: 'Email list' },
  // Connect cards are handled below: check-in, tags from their answers, and a welcome.
  card: {},
}

export type Contact = { name?: string | null; email?: string | null; phone?: string | null }

/**
 * Finds someone in People by email or phone (so repeat visitors aren't duplicated), or adds them.
 * Adds the tags given. Returns the person and whether they were new.
 */
export async function findOrCreatePerson(
  req: PayloadRequest,
  c: Contact,
  opts: { source?: string; tags?: string[]; stage?: string; logAs?: string } = {},
) {
  const email = String(c.email ?? '').trim().toLowerCase()
  const phone = digits(c.phone)
  const name = String(c.name ?? '').trim()
  if (!email && !phone) return null
  const { payload } = req
  const skipLog = req.context?.skipLog

  const or: Where[] = [...(email ? [{ email: { equals: email } }] : []), ...(phone ? [{ phoneDigits: { equals: phone } }] : [])]
  const match = await payload.find({ collection: 'people', where: { or }, limit: 1, depth: 0, req })
  const tagIds: Array<string | number> = []
  for (const t of opts.tags ?? []) tagIds.push(await tagId(payload, t, req))

  let person = match.docs[0] as { id: string | number; firstName?: string; stage?: string; tags?: unknown[] } | undefined
  if (person) {
    const tags = (person.tags ?? []).map((t) => (typeof t === 'object' && t ? (t as { id: string | number }).id : t))
    const add = tagIds.filter((t) => !tags.includes(t))
    if (add.length) {
      await payload.update({ collection: 'people', id: person.id, data: { tags: [...tags, ...add] } as never, req, context: { skipLog: true } })
      req.context.skipLog = skipLog
    }
    return { person, isNew: false }
  }
  const [firstName, ...rest] = name && name !== 'Not given' ? name.split(/\s+/) : ['Guest']
  person = (await payload.create({
    collection: 'people',
    req,
    context: { skipLog: true },
    data: {
      firstName,
      lastName: rest.join(' '),
      email,
      phone: c.phone ?? '',
      stage: opts.stage ?? 'new-guest',
      source: opts.source,
      tags: tagIds,
    } as never,
  })) as unknown as typeof person
  req.context.skipLog = skipLog
  await logChange(req, {
    area: 'People',
    summary: `${name || 'A guest'} added to People ${opts.logAs ?? 'from the website'}`,
    source: 'system',
    href: `/admin/collections/people/${person!.id}`,
  })
  return { person: person!, isNew: true }
}

/** Adds a follow-up due in `days`, unless the person already has an open one. */
export async function addFollowUp(req: PayloadRequest, personId: string | number, title: string, days = 2, extra: Record<string, unknown> = {}) {
  const { payload } = req
  const open = await payload.count({
    collection: 'follow-ups',
    where: { and: [{ person: { equals: personId } }, { done: { not_equals: true } }] },
    req,
  })
  if (open.totalDocs) return null
  const due = new Date()
  due.setUTCDate(due.getUTCDate() + days)
  const skipLog = req.context?.skipLog
  const doc = await payload.create({
    collection: 'follow-ups',
    req,
    context: { skipLog: true },
    data: { title, person: personId, due: due.toISOString(), ...extra } as never,
  })
  req.context.skipLog = skipLog
  return doc
}

/** The connect card's "I'd like to…" answers become tags staff can filter by. */
export const CARD_TAGS: Record<string, string> = {
  jesus: 'Exploring faith',
  group: 'Small Groups',
  serve: 'Volunteer',
  baptism: 'Baptism',
  member: 'Membership class',
}

/**
 * A form response from the website becomes a person in People plus a follow-up task due in two days.
 * Prayer requests are private, so they stay in the Inbox only.
 * Connect cards also check the person in for today, and move returning guests along the pipeline.
 */
export async function linkResponseToPerson(
  req: PayloadRequest,
  doc: { id: string | number; formType?: string | null; name?: string | null; email?: string | null; phone?: string | null; summary?: string | null; meta?: unknown },
) {
  const plan = doc.formType ? FORM_FOLLOW_UP[doc.formType] : undefined
  if (!plan) return
  const { payload } = req
  const meta = (doc.meta ?? {}) as { visit?: string; wants?: string[]; serviceDate?: string }
  const tags = [...(plan.tag ? [plan.tag] : []), ...(meta.wants ?? []).map((w) => CARD_TAGS[w]).filter(Boolean)]
  const found = await findOrCreatePerson(req, doc, {
    source: doc.formType ?? undefined,
    tags,
    stage: doc.formType === 'card' && meta.visit === 'home' ? 'connected' : 'new-guest',
  })
  if (!found) return
  const { person, isNew } = found
  const first = person.firstName || String(doc.name ?? '').split(' ')[0] || 'them'

  await payload.update({ collection: 'inbox', id: doc.id, data: { person: person.id } as never, req, context: { skipLog: true } })

  if (doc.formType === 'card') {
    const skipLog = req.context?.skipLog
    // Filling out a card on Sunday counts as being there.
    await checkIn(req, person.id, meta.serviceDate, 'card')
    // Someone we already knew as a new guest came back: that's a second visit.
    if (!isNew && meta.visit !== 'first' && ['new-guest', 'contacted'].includes(String(person.stage))) {
      await payload.update({ collection: 'people', id: person.id, data: { stage: 'second-visit' } as never, req })
    }
    req.context.skipLog = skipLog
    if (meta.visit === 'first' || isNew) await addFollowUp(req, person.id, `Welcome ${first}: thank them for visiting this week`, 1)
    else if ((meta.wants ?? []).length) await addFollowUp(req, person.id, `Connect ${first} with their next step from the card`, 2)
    return
  }

  if (plan.task) await addFollowUp(req, person.id, plan.task(first))
}

/** Records that someone was at church on a given day (once per person per day). */
export async function checkIn(req: PayloadRequest, personId: string | number, date?: string | null, how: 'card' | 'staff' = 'staff') {
  const day = serviceDay(date)
  const { payload } = req
  const dup = await payload.count({
    collection: 'attendance',
    where: { and: [{ person: { equals: personId } }, { date: { equals: day } }] },
    req,
  })
  if (dup.totalDocs) return null
  const skipLog = req.context?.skipLog
  const doc = await payload.create({ collection: 'attendance', req, context: { skipLog: true }, data: { person: personId, date: day, how } as never })
  req.context.skipLog = skipLog
  return doc
}

/** A date as noon UTC on that calendar day (in Eastern time), so it never slips a day. */
export function serviceDay(date?: string | null) {
  const ymd = date && /^\d{4}-\d{2}-\d{2}/.test(date)
    ? date.slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  return `${ymd}T12:00:00.000Z`
}
