import type { Payload } from 'payload'
import { loadStarterContent } from './starter'
import { loadPortrait } from './portraits'

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
  // Oct 2026: "Pastor Renee Walker" became "Pastors Jacob & Renee Walker" with a couple photo.
  const old = await payload.find({ collection: 'leaders', where: { name: { equals: 'Pastor Renee Walker' } }, limit: 1, depth: 0 })
  const doc = old.docs[0]
  if (!doc) return
  const name = 'Pastors Jacob & Renee Walker'
  const photo = await loadPortrait(payload, name)
  await payload.update({
    collection: 'leaders',
    id: doc.id,
    context: { skipLog: true },
    data: {
      name,
      title: 'Lead Pastors',
      bio: 'Jacob and Renee have led Cedar Hill together for twelve years. They love a full fellowship hall, a long walk after Sunday dinner, and a sermon that sends people out ready to serve their neighbors.',
      ...(photo ? { photo } : {}),
    } as never,
  })
  payload.logger.info('Updated the lead pastors to Jacob & Renee Walker')
}
