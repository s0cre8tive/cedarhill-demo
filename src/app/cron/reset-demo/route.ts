import { getPayload } from 'payload'
import config from '@payload-config'
import { resetDemo } from '@/lib/demo'

/**
 * Nightly demo clean-up. Vercel calls this on the schedule in vercel.json and
 * sends "Authorization: Bearer <CRON_SECRET>". Without CRON_SECRET set, it does nothing.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (process.env.DEMO_RESET === 'off') return Response.json({ skipped: 'Reset is turned off.' })
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 })
  }
  const payload = await getPayload({ config })
  try {
    await resetDemo(payload, 'Nightly reset')
    return Response.json({ ok: true })
  } catch (err) {
    payload.logger.error({ err, msg: 'Nightly demo reset failed' })
    return Response.json({ error: 'Reset failed' }, { status: 500 })
  }
}
