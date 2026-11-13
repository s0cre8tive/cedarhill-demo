import type { Payload } from 'payload'
import { loadStarterContent, LEAD_PASTORS } from './starter'
import { loadPortrait } from './portraits'
import { loadStarterSundays } from './starterSundays'
import { scanCare } from './care'

/**
 * Runs when the site starts. On a brand-new database it loads the Cedar Hill
 * demo content and photos. It never creates logins — on a live site the first
 * person to visit /admin creates the Pastor / Admin account.
 */
export async function firstRun(payload: Payload) {
  try {
    await loadStarterContent(payload)
    await upgradeDemo(payload)
  } catch (err) {
    payload.logger.error({ err, msg: 'First-run setup skipped' })
  }
}

/** One-time updates for demos that were set up before a content change. */
async function upgradeDemo(payload: Payload) {
  // Nov 2026: check-in, serve, sign-ups, Watch and the Sunday Recap. Older demos get their sample data once.
  if (process.env.DEMO_RESET !== 'off') {
    const [slots, people] = await Promise.all([payload.count({ collection: 'serve-slots' }), payload.count({ collection: 'people' })])
    if (!slots.totalDocs && people.totalDocs) {
      await loadStarterSundays(payload)
      await scanCare(payload)
      payload.logger.info('Added the Sundays demo content (check-in, serve, recap)')
    }
  }
  // Oct 2026: "Pastor Renee Walker" became "Pastors Jacob & Renee Walker" with a couple photo.
  const old = await payload.find({ collection: 'leaders', where: { name: { equals: 'Pastor Renee Walker' } }, limit: 1, depth: 0 })
  const doc = old.docs[0]
  if (!doc) return
  const photo = await loadPortrait(payload, LEAD_PASTORS.name)
  await payload.update({
    collection: 'leaders',
    id: doc.id,
    context: { skipLog: true },
    data: { ...LEAD_PASTORS, photo: photo ?? null } as never,
  })
  payload.logger.info('Updated the lead pastors to Jacob & Renee Walker')
}
