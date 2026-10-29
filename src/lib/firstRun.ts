import type { Payload } from 'payload'
import { loadStarterContent } from './starter'

/**
 * Runs when the site starts. On a brand-new database it loads the Cedar Hill
 * demo content and photos. It never creates logins — on a live site the first
 * person to visit /admin creates the Pastor / Admin account.
 */
export async function firstRun(payload: Payload) {
  try {
    await loadStarterContent(payload)
  } catch (err) {
    payload.logger.error({ err, msg: 'First-run setup skipped' })
  }
}
