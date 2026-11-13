import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import React from 'react'
import { missingPeople } from '../../lib/care'
import { stageLabel } from '../../lib/stages'
import { CheckInBoard, type Row } from './CheckInBoard'

/** The most recent Sunday (today, if it's Sunday) in Eastern time, as YYYY-MM-DD. */
function lastSunday() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}
const shift = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** /admin/check-in: tap people in as they arrive. Feeds "Last at church" and care alerts. */
export async function CheckIn({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req
  const admin = payload.config.routes.admin
  if (!user) redirect(`${admin}/login?redirect=${encodeURIComponent(`${admin}/check-in`)}`)

  const raw = String((searchParams as Record<string, string | undefined>)?.d ?? '')
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : lastSunday()
  const iso = `${day}T12:00:00.000Z`

  const [people, here, missing] = await Promise.all([
    payload.find({ collection: 'people', limit: 2000, depth: 0, sort: 'firstName', user, overrideAccess: false }),
    payload.find({ collection: 'attendance', where: { date: { equals: iso } }, limit: 2000, depth: 0, user, overrideAccess: false }),
    missingPeople(payload),
  ])
  const byPerson = new Map(here.docs.map((a) => [String(typeof a.person === 'object' ? a.person.id : a.person), { id: String(a.id), how: a.how ?? 'staff' }]))
  const rows: Row[] = people.docs.map((p) => ({
    id: String(p.id),
    name: p.fullName || p.firstName,
    stage: stageLabel(p.stage),
    checkin: byPerson.get(String(p.id)) ?? null,
  }))
  const label = new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div className="ch-pipe ch-ci">
        <div className="ch-pipe__head">
          <div>
            <p className="ch-kicker">Sundays · Check-in</p>
            <h1>Who’s here today?</h1>
            <p className="ch-welcome__sub">
              Tap a name as people arrive. Connect cards check people in on their own. If someone who usually comes misses
              three Sundays, they show up in Care alerts with a follow-up.
            </p>
          </div>
          <div className="ch-ci__day">
            <a className="ch-ci__nav" href={`${admin}/check-in?d=${shift(day, -7)}`} aria-label="Previous Sunday">
              ←
            </a>
            <b>{label}</b>
            <a className="ch-ci__nav" href={`${admin}/check-in?d=${shift(day, 7)}`} aria-label="Next Sunday">
              →
            </a>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="ch-care">
            <div className="ch-care__top">
              <h2>
                Care alerts <span>{missing.length}</span>
              </h2>
              <p>Usually here, but missing for three Sundays or more. A quick “we miss you” goes a long way.</p>
            </div>
            <div className="ch-care__list">
              {missing.map((m) => (
                <a key={m.id} className="ch-care__item" href={`${admin}/collections/people/${m.id}`}>
                  <b>{m.name}</b>
                  <span>
                    Last here{' '}
                    {new Date(m.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · {m.weeks}{' '}
                    weeks ago
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <CheckInBoard rows={rows} date={iso} admin={admin} />
      </div>
    </DefaultTemplate>
  )
}
