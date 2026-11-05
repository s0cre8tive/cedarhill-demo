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
}

/**
 * A form response from the website becomes a person in People (matched by email or phone,
 * so repeat visitors aren't duplicated) plus a follow-up task due in two days.
 * Prayer requests are private, so they stay in the Inbox only.
 */
export async function linkResponseToPerson(
  req: PayloadRequest,
  doc: { id: string | number; formType?: string | null; name?: string | null; email?: string | null; phone?: string | null },
) {
  const plan = doc.formType ? FORM_FOLLOW_UP[doc.formType] : undefined
  if (!plan) return
  const email = String(doc.email ?? '').trim().toLowerCase()
  const phone = digits(doc.phone)
  const name = String(doc.name ?? '').trim()
  if (!email && !phone) return
  const { payload } = req
  const skipLog = req.context?.skipLog

  const or: Where[] = [...(email ? [{ email: { equals: email } }] : []), ...(phone ? [{ phoneDigits: { equals: phone } }] : [])]
  const match = await payload.find({ collection: 'people', where: { or }, limit: 1, depth: 0, req })
  const tag = plan.tag ? await tagId(payload, plan.tag, req) : null

  let person = match.docs[0] as { id: string | number; firstName?: string; tags?: unknown[] } | undefined
  if (person) {
    const tags = (person.tags ?? []).map((t) => (typeof t === 'object' && t ? (t as { id: string | number }).id : t))
    if (tag && !tags.includes(tag)) {
      await payload.update({ collection: 'people', id: person.id, data: { tags: [...tags, tag] } as never, req, context: { skipLog: true } })
    }
  } else {
    const [firstName, ...rest] = name && name !== 'Not given' ? name.split(/\s+/) : ['Guest']
    person = (await payload.create({
      collection: 'people',
      req,
      context: { skipLog: true },
      data: {
        firstName,
        lastName: rest.join(' '),
        email,
        phone: doc.phone ?? '',
        stage: 'new-guest',
        source: doc.formType,
        tags: tag ? [tag] : [],
      } as never,
    })) as unknown as typeof person
    req.context.skipLog = skipLog
    await logChange(req, {
      area: 'People',
      summary: `${name || 'A guest'} added to People from the website`,
      source: 'system',
      href: `/admin/collections/people/${person!.id}`,
    })
  }

  await payload.update({ collection: 'inbox', id: doc.id, data: { person: person!.id } as never, req, context: { skipLog: true } })

  if (!plan.task) return

  // One open follow-up per person is enough. A repeat visitor doesn't get a second one.
  const open = await payload.count({
    collection: 'follow-ups',
    where: { and: [{ person: { equals: person!.id } }, { done: { not_equals: true } }] },
    req,
  })
  if (open.totalDocs) return

  const due = new Date()
  due.setUTCDate(due.getUTCDate() + 2)
  await payload.create({
    collection: 'follow-ups',
    req,
    context: { skipLog: true },
    data: { title: plan.task!(person!.firstName || name.split(' ')[0] || 'them'), person: person!.id, due: due.toISOString() } as never,
  })
}
