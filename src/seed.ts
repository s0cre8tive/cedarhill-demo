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
import { ensureDemoUsers, resetDemo } from './lib/demo'

async function run() {
  // Starter content loads automatically when Payload starts (onInit).
  const payload = await getPayload({ config })
  await loadStarterContent(payload)

  const { totalDocs: users } = await payload.count({ collection: 'users' })
  if (!users) {
    await ensureDemoUsers(payload, { includePastor: true })
    // Reload so the sample follow-ups are assigned to Tasha and Marcus.
    await resetDemo(payload, 'Setup')
    payload.logger.info('Created demo logins (password CedarHill2026). Marcus posted the Youth Lock-In for approval.')
  }

  payload.logger.info('✅ Done. Run "npm run dev" and open http://localhost:3000')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
