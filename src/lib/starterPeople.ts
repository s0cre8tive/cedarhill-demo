import type { Payload } from 'payload'

/** Fictional people for the Cedar Hill demo pipeline. */
const TAGS = ['Youth', 'Kids', 'Worship & Arts', 'Small Groups', 'Prayer Team', 'Outreach', 'Volunteer', 'New believer', 'Membership class']

type P = {
  first: string
  last: string
  stage: string
  tags: string[]
  source: string
  who?: 'office' | 'youth'
  task?: { title: string; days: number; who?: 'office' | 'youth' }
}

const PEOPLE: P[] = [
  { first: 'Sarah', last: 'Lin', stage: 'new-guest', tags: ['Small Groups'], source: 'visit', who: 'office', task: { title: 'Welcome Sarah: call or text before Sunday', days: 0 } },
  { first: 'Tonya', last: 'Brooks', stage: 'new-guest', tags: ['Kids'], source: 'visit', task: { title: 'Welcome Tonya: show her family Cedar Kids check-in', days: 1, who: 'office' } },
  { first: 'Devin', last: 'Carter', stage: 'contacted', tags: ['Youth'], source: 'event', who: 'youth', task: { title: 'Invite Devin to Wednesday youth night', days: -1 } },
  { first: 'Alicia', last: 'Gomez', stage: 'contacted', tags: ['Worship & Arts', 'Volunteer'], source: 'in-person', who: 'office', task: { title: 'Introduce Alicia to Jordan in Worship & Arts', days: 3 } },
  { first: 'Kevin', last: 'Price', stage: 'second-visit', tags: ['Small Groups'], source: 'visit', who: 'office', task: { title: 'Connect Kevin with a small group leader', days: 0 } },
  { first: 'Jada', last: 'Thompson', stage: 'second-visit', tags: ['Youth'], source: 'event', who: 'youth', task: { title: 'Text Jada’s mom about the Youth Lock-In', days: 2 } },
  { first: 'Michael', last: 'Osei', stage: 'connected', tags: ['New believer'], source: 'salvation', who: 'office', task: { title: 'Reach out to Michael about baptism', days: 5 } },
  { first: 'Ellen', last: 'Hayes', stage: 'connected', tags: ['Prayer Team', 'Volunteer'], source: 'in-person', who: 'office' },
  { first: 'Grace', last: 'Kim', stage: 'member', tags: ['Kids', 'Volunteer', 'Membership class'], source: 'member', who: 'office' },
  { first: 'Andre', last: 'Wallace', stage: 'member', tags: ['Outreach'], source: 'member' },
]

const dayISO = (days: number) => {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export async function loadStarterPeople(payload: Payload) {
  const ctx = { skipLog: true, noCrm: true }
  const users: Record<string, string | number | null> = { office: null, youth: null }
  for (const [k, email] of [['office', 'office@cedarhill.demo'], ['youth', 'youth@cedarhill.demo']] as const) {
    const u = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })
    users[k] = u.docs[0]?.id ?? null
  }

  const tagIds: Record<string, string | number> = {}
  for (const name of TAGS) {
    const found = await payload.find({ collection: 'tags', where: { name: { equals: name } }, limit: 1, depth: 0 })
    tagIds[name] = found.docs[0]?.id ?? (await payload.create({ collection: 'tags', data: { name }, context: ctx })).id
  }

  for (const [i, p] of PEOPLE.entries()) {
    const person = await payload.create({
      collection: 'people',
      context: ctx,
      data: {
        firstName: p.first,
        lastName: p.last,
        email: `${p.first}.${p.last}@example.com`.toLowerCase(),
        phone: `(301) 555-01${String(60 + i)}`,
        stage: p.stage,
        tags: p.tags.map((t) => tagIds[t]),
        source: p.source,
        assignedTo: p.who ? users[p.who] : null,
      } as never,
    })
    if (p.task) {
      await payload.create({
        collection: 'follow-ups',
        context: ctx,
        data: {
          title: p.task.title,
          person: person.id,
          assignedTo: users[p.task.who ?? p.who ?? 'office'] ?? null,
          due: dayISO(p.task.days),
        } as never,
      })
    }
    // Sarah filled out Plan a Visit on the website, so she has a form response too.
    if (p.first === 'Sarah') {
      await payload.create({
        collection: 'inbox',
        context: ctx,
        data: {
          formType: 'visit',
          status: 'following-up',
          name: 'Sarah Lin',
          email: 'sarah.lin@example.com',
          phone: '(301) 555-0160',
          summary: 'Which service: Sunday Worship, 10:30 AM\nComing with: Just me\nAnything we should know: New to Maple Grove and looking for a small group.',
          visibility: 'team',
          person: person.id,
        } as never,
      })
    }
  }
}
