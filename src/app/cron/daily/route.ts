import { getPayload } from 'payload'
import config from '@payload-config'
import { scanCare, sendReminders } from '@/lib/care'
import { draftRecap } from '@/lib/recap'
import { sendDailySummaries } from '@/lib/teamMail'

/**
 * Every morning: sign-up reminders for tomorrow, care alerts for anyone missing three Sundays,
 * (on Mondays) a fresh Sunday Recap draft, and on weekdays the team summary for people who asked
 * for one email a day (Cathedral). Vercel calls this on the schedule in vercel.json.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 })
  }
  const payload = await getPayload({ config })
  const out: Record<string, unknown> = {}
  for (const [name, job] of [
    ['reminders', () => sendReminders(payload)],
    ['care', () => scanCare(payload)],
    ['teamSummary', () => sendDailySummaries(payload)],
    [
      'recap',
      async () => {
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' }).format(new Date())
        return weekday === 'Mon' ? { draft: (await draftRecap(payload)).id } : { skipped: 'Not Monday' }
      },
    ],
  ] as const) {
    try {
      out[name] = await job()
    } catch (err) {
      payload.logger.error({ err, msg: `Daily job "${name}" failed` })
      out[name] = { error: (err as Error).message }
    }
  }
  return Response.json(out)
}
