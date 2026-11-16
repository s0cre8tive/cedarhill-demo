import { getPayload } from 'payload'
import config from '@payload-config'
import { sendWeeklyRundown } from '@/lib/teamMail'

/**
 * Thursday afternoon (Eastern): the weekly rundown for everyone on a team (Cathedral).
 * This Sunday's events, team announcements they haven't read, and anything waiting on them.
 * Vercel calls this on the schedule in vercel.json. Add ?force=1 to send it on another day.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 })
  }
  const payload = await getPayload({ config })
  try {
    const force = new URL(req.url).searchParams.get('force') === '1'
    return Response.json(await sendWeeklyRundown(payload, { force }))
  } catch (err) {
    payload.logger.error({ err, msg: 'Weekly rundown failed' })
    return Response.json({ error: 'The weekly rundown didn’t finish.' }, { status: 500 })
  }
}
