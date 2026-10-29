/**
 * For trying the demo on your computer:
 *
 *   npm run seed
 *
 * Loads Cedar Hill's demo content (and photos) and creates three demo logins:
 * Pastor / Admin, Office Editor, and a Ministry Leader (Marcus, Youth).
 * Safe to run more than once — it skips anything that already exists.
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { loadStarterContent } from './lib/starter'

const PASSWORD = 'CedarHill2026'

async function run() {
  // Starter content loads automatically when Payload starts (onInit).
  const payload = await getPayload({ config })
  await loadStarterContent(payload)

  const { totalDocs: users } = await payload.count({ collection: 'users' })
  if (!users) {
    const youth = await payload.find({ collection: 'ministries', where: { name: { equals: 'Cedar Youth' } }, limit: 1 })
    await payload.create({
      collection: 'users',
      data: { name: 'Pastor Renee Walker', email: 'pastor@cedarhill.demo', password: PASSWORD, role: 'admin' } as never,
    })
    await payload.create({
      collection: 'users',
      data: { name: 'Tasha Bennett', email: 'office@cedarhill.demo', password: PASSWORD, role: 'editor' } as never,
    })
    const marcus = await payload.create({
      collection: 'users',
      data: { name: 'Marcus Reed', email: 'youth@cedarhill.demo', password: PASSWORD, role: 'leader', ministry: youth.docs[0]?.id } as never,
    })
    payload.logger.info('Created demo logins')

    // A real example of the approval queue: Marcus posts the Youth Lock-In,
    // which waits for the office to approve it.
    const d = new Date('2026-11-21T12:00:00.000Z')
    while (d < new Date()) d.setUTCDate(d.getUTCDate() + 7)
    await payload.create({
      collection: 'events',
      user: marcus,
      overrideAccess: false,
      data: {
        title: 'Youth Lock-In',
        date: d.toISOString(),
        time: '7:00 PM – 7:00 AM',
        location: 'Youth Room',
        details: 'An all-nighter with games, worship, pizza and breakfast. Permission slip required.',
      } as never,
    })
    payload.logger.info('Marcus posted the Youth Lock-In (waiting for approval)')
  }

  payload.logger.info('✅ Done. Run "npm run dev" and open http://localhost:3000')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
