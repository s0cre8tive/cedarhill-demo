import React from 'react'
import { getPayloadClient, getSiteInfo } from '@/lib/site'
import { dayOf, fmtDay, taken } from '@/lib/signups'
import { serviceDay } from '@/lib/crm'
import { SERVE_TEAMS, teamLabel } from '@/collections/ServeSlots'
import { FormShell, OtherSteps } from '../FormShell'
import { ServeBoard, type Shift } from './ServeBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Serve · Cedar Hill' }

export default async function ServePage() {
  const payload = await getPayloadClient()
  const { info } = await getSiteInfo()
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 36)
  const slots = await payload.find({
    collection: 'serve-slots',
    where: { and: [{ date: { greater_than_equal: serviceDay().slice(0, 10) } }, { date: { less_than: end.toISOString() } }] },
    sort: 'date',
    limit: 80,
    depth: 0,
  })
  const shifts: Shift[] = []
  for (const s of slots.docs) {
    if (dayOf(s.date) < serviceDay()) continue
    const used = await taken(payload, 'serve', s.id)
    shifts.push({
      id: String(s.id),
      team: teamLabel(s.team),
      blurb: SERVE_TEAMS.find((t) => t.value === s.team)?.blurb ?? '',
      day: fmtDay(s.date),
      time: s.time ?? '',
      notes: s.notes ?? '',
      spots: s.spots ?? 0,
      left: Math.max(0, (s.spots ?? 0) - used),
    })
  }
  const open = shifts.reduce((n, s) => n + s.left, 0)

  return (
    <FormShell
      decor="rays"
      kicker="Serve"
      title={
        <>
          Find your
          <br />
          <em>spot.</em>
        </>
      }
      lede={`Every Sunday runs on volunteers. Pick a shift that fits your week, and we’ll send a reminder the day before.${open ? ` Right now ${open} ${open === 1 ? 'spot is' : 'spots are'} open.` : ''}`}
      aside={
        <>
          <div className="info dark">
            <p className="v">“As every man hath received the gift, even so minister the same one to another.”</p>
            <small>1 Peter 4:10 (KJV)</small>
          </div>
          <div className="info">
            <h3>The teams</h3>
            {SERVE_TEAMS.map((t) => (
              <p key={t.value} style={{ marginBottom: 10 }}>
                <b style={{ color: '#1C1633' }}>{t.label}.</b> {t.blurb}
              </p>
            ))}
          </div>
          <div className="info">
            <h3>New to serving?</h3>
            <p>
              No experience needed. Pick any shift and a team leader will meet you 15 minutes early. Questions? Call {info.phone}.
            </p>
          </div>
          <OtherSteps current="" />
        </>
      }
    >
      <ServeBoard shifts={shifts} />
    </FormShell>
  )
}
