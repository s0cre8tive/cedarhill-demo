import type { Payload } from 'payload'
import { loadStarterContent } from './starter'
import { loadStarterPeople } from './starterPeople'
import { scanCare } from './care'
import { clearTeam, loadStarterTeam } from './starterTeam'

/**
 * Demo helpers for Cedar Hill (Kingdom Kit case study):
 * pastor portraits, the shareable demo logins, and "Reset demo".
 */

export const DEMO_PASSWORD = 'CedarHill2026'

type DemoUser = { name: string; email: string; role: 'admin' | 'editor' | 'leader'; ministry?: string }

const PASTOR: DemoUser = { name: 'Pastor Renee Walker', email: 'pastor@cedarhill.demo', role: 'admin' }
const OFFICE: DemoUser = { name: 'Tasha Bennett', email: 'office@cedarhill.demo', role: 'editor' }
const YOUTH: DemoUser = { name: 'Marcus Reed', email: 'youth@cedarhill.demo', role: 'leader', ministry: 'Cedar Youth' }

/**
 * Creates (or repairs) demo logins with the shared demo password, unlocked.
 * Online, "Reset demo" only manages the two shareable logins (office + youth);
 * the Pastor / Admin demo login is only created on your computer by `npm run seed`.
 */
export async function ensureDemoUsers(payload: Payload, opts: { includePastor?: boolean } = {}) {
  const list = opts.includePastor ? [PASTOR, OFFICE, YOUTH] : [OFFICE, YOUTH]
  let marcus: Record<string, unknown> | null = null
  for (const u of list) {
    let ministry: string | number | null = null
    if (u.ministry) {
      const m = await payload.find({ collection: 'ministries', where: { name: { equals: u.ministry } }, limit: 1, depth: 0 })
      ministry = m.docs[0]?.id ?? null
    }
    const data = { name: u.name, role: u.role, ministry, password: DEMO_PASSWORD, loginAttempts: 0, lockUntil: null }
    const found = await payload.find({ collection: 'users', where: { email: { equals: u.email } }, limit: 1, depth: 0 })
    const doc = found.docs[0]
      ? await payload.update({ collection: 'users', id: found.docs[0].id, data: data as never })
      : await payload.create({ collection: 'users', data: { ...data, email: u.email } as never })
    if (u === YOUTH) marcus = doc as unknown as Record<string, unknown>
  }

  // A real example for the approval queue: Marcus posts the Youth Lock-In and it waits for the office.
  if (marcus) {
    const d = new Date('2026-11-21T12:00:00.000Z')
    while (d < new Date()) d.setUTCDate(d.getUTCDate() + 7)
    await payload.create({
      collection: 'events',
      user: { ...marcus, collection: 'users' } as never,
      overrideAccess: false,
      data: {
        title: 'Youth Lock-In',
        date: d.toISOString(),
        time: '7:00 PM – 7:00 AM',
        location: 'Youth Room',
        details: 'An all-nighter with games, worship, pizza and breakfast. Permission slip required.',
      } as never,
    })
  }
}

/** Wipes the demo content and loads Cedar Hill's starter content again. Accounts you added are kept. */
export async function resetDemo(payload: Payload, by: string) {
  const ctx = { skipLog: true }
  // Team Communication points at people, events and logins, so it goes first of all.
  await clearTeam(payload)
  // Order matters: things that point at photos/ministries go first.
  for (const collection of ['signups', 'attendance', 'recaps', 'serve-slots', 'events', 'sermons', 'leaders', 'inbox', 'follow-ups', 'people', 'tags', 'ministries', 'changes'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, context: ctx })
  }
  // Keep the starter photos (all named "cedarhill-…") so they don't have to be downloaded again.
  // Anything visitors uploaded is removed.
  const media = await payload.find({ collection: 'media', pagination: false, depth: 0 })
  for (const m of media.docs) {
    if (!String(m.filename ?? '').startsWith('cedarhill-')) {
      await payload.delete({ collection: 'media', id: m.id, context: ctx })
    }
  }
  await loadStarterContent(payload, { reset: true, skipPeople: true })
  await ensureDemoUsers(payload)
  // People come last so their follow-ups can be assigned to Tasha and Marcus.
  await loadStarterPeople(payload)
  // Cathedral: teams, team announcements, the Youth thread and notes on records.
  await loadStarterTeam(payload)
  // The starter content adds its own "loaded" entry; replace it with who reset it.
  await payload.delete({ collection: 'changes', where: { source: { equals: 'system' } }, context: ctx })
  await payload.create({
    collection: 'changes',
    context: ctx,
    data: { summary: 'Demo reset to the Cedar Hill starter content', area: 'Website', source: 'system', status: 'live', by },
  })
  // Two regulars have been missing for a few Sundays, so care alerts have something to show.
  await scanCare(payload)
}
