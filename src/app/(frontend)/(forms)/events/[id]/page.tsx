import React from 'react'
import { notFound } from 'next/navigation'
import { getPayloadClient, getSiteInfo, photo } from '@/lib/site'
import { dayOf, fmtDay, taken } from '@/lib/signups'
import { serviceDay } from '@/lib/crm'
import { FormShell, OtherSteps } from '../../FormShell'
import { SignUpForm } from '../../SignUpForm'

export const dynamic = 'force-dynamic'

async function load(id: string) {
  const payload = await getPayloadClient()
  const e = await payload.findByID({ collection: 'events', id, depth: 1 }).catch(() => null)
  if (!e || e.approval !== 'live') return null
  const used = e.signUp ? await taken(payload, 'event', e.id) : 0
  return { e, left: e.capacity ? Math.max(0, e.capacity - used) : null, used, past: dayOf(e.date) < serviceDay() }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const d = await load((await params).id)
  return { title: d ? `${d.e.title} · Cedar Hill` : 'Event · Cedar Hill' }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id)
  if (!data) notFound()
  const { e, left, used, past } = data
  const { info } = await getSiteInfo()
  const img = photo(e.flyer, 'large')
  const ministry = typeof e.ministry === 'object' && e.ministry ? e.ministry.name : ''
  const open = e.signUp && !past && left !== 0

  return (
    <FormShell
      decor="arc"
      kicker={[fmtDay(e.date), ministry].filter(Boolean).join(' · ')}
      title={e.title}
      lede={e.details || 'Join us! Everyone is welcome.'}
      aside={
        <>
          <div className="info dark">
            <h3>When &amp; where</h3>
            <div className="trow">
              <b>Date</b>
              <span>{fmtDay(e.date).replace(/^\w+, /, '')}</span>
            </div>
            {e.time && (
              <div className="trow">
                <b>Time</b>
                <span>{e.time}</span>
              </div>
            )}
            {e.location && (
              <div className="trow">
                <b>Where</b>
                <span>{e.location}</span>
              </div>
            )}
          </div>
          {img && (
            <div className="info" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={img.url} alt={img.alt} style={{ display: 'block', width: '100%', height: 'auto' }} />
            </div>
          )}
          <div className="info">
            <h3>Questions?</h3>
            <p>
              Call the church office at <a href={info.phoneHref}>{info.phone}</a>.
            </p>
          </div>
          <OtherSteps current="" />
        </>
      }
    >
      {open ? (
        <>
          <div className="su-head">
            <h2>Save your spot</h2>
            <p>
              {left != null ? (
                <>
                  <b>{left}</b> {left === 1 ? 'spot' : 'spots'} left
                </>
              ) : used > 0 ? (
                <>
                  <b>{used}</b> {used === 1 ? 'person is' : 'people are'} coming
                </>
              ) : (
                'Be the first to sign up'
              )}
              {' · '}a reminder comes the day before
            </p>
          </div>
          <SignUpForm kind="event" id={String(e.id)} guests={left ?? 8} submitLabel="Sign me up" />
        </>
      ) : (
        <div className="su-head">
          <h2>{past ? 'This one has passed' : e.signUp ? 'This event is full' : 'No sign-up needed'}</h2>
          <p>
            {past
              ? 'Thanks to everyone who came. See what’s coming up next on the homepage.'
              : e.signUp
                ? 'Thank you for wanting to come! Call the office to join the waiting list.'
                : 'Just come! Everyone is welcome.'}
          </p>
          <p style={{ marginTop: 20 }}>
            <a className="btn btn-ink" href="/#events">
              See all events
            </a>
          </p>
        </div>
      )}
    </FormShell>
  )
}
