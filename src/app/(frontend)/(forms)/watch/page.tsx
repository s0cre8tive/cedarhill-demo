import React from 'react'
import { getPayloadClient, getSiteInfo } from '@/lib/site'
import { youTubeId } from '@/lib/recap'
import { FormShell } from '../FormShell'
import { WatchRoom, type Message } from './WatchRoom'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Watch & catch up · Cedar Hill' }

/** "Is it Sunday morning service time right now?" in Eastern time. */
function liveNow() {
  const parts = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false, timeZone: 'America/New_York' }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const mins = Number(get('hour')) * 60 + Number(get('minute'))
  return get('weekday') === 'Sun' && mins >= 10 * 60 + 15 && mins <= 12 * 60 + 15
}

export default async function WatchPage({ searchParams }: { searchParams: Promise<{ s?: string; t?: string }> }) {
  const sp = await searchParams
  const payload = await getPayloadClient()
  const [{ info }, res, recap] = await Promise.all([
    getSiteInfo(),
    payload.find({ collection: 'sermons', sort: '-date', limit: 60, depth: 0 }),
    payload.find({ collection: 'recaps', where: { status: { equals: 'sent' } }, sort: '-weekOf', limit: 1, depth: 0 }),
  ])
  const messages: Message[] = res.docs.map((s) => ({
    id: String(s.id),
    title: s.title,
    preacher: s.preacher ?? '',
    scripture: s.scripture ?? '',
    series: s.series ?? '',
    summary: s.summary ?? '',
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    video: s.video ?? '',
    yt: youTubeId(s.video),
    clips: (s.clips ?? []).map((c) => ({ title: c.title, at: c.at })),
  }))
  const sunday = info.services[0]
  const live = liveNow()

  return (
    <FormShell
      decor="glow"
      kicker="Watch & Catch Up"
      title={
        <>
          Missed Sunday?
          <br />
          <em>Catch up.</em>
        </>
      }
      lede="Every message, the best moments as short clips, and the live stream on Sunday mornings. Watch from anywhere, any day of the week."
      extra={
        <div className="wt-live">
          <span className={`wt-dot${live ? ' is-live' : ''}`} aria-hidden="true" />
          {live ? (
            <>
              <b>We’re live right now.</b>
              {info.liveLink && (
                <a className="btn btn-ink" href={info.liveLink} target="_blank" rel="noopener">
                  Join the live stream
                </a>
              )}
            </>
          ) : (
            <span>
              <b>Live every {sunday?.day ?? 'Sunday'}</b> at {sunday?.time ?? '10:30 AM'}
              {info.liveLink ? (
                <>
                  {' · '}
                  <a href={info.liveLink} target="_blank" rel="noopener">
                    Live stream link
                  </a>
                </>
              ) : null}
            </span>
          )}
        </div>
      }
      aside={
        <>
          {recap.docs[0] && (
            <a className="info dark wt-recap" href={`/recap/${recap.docs[0].id}`}>
              <small>This week’s Sunday Recap</small>
              <h3>{recap.docs[0].subject.replace(/^Sunday Recap:\s*/, '')}</h3>
              <p>The message, this week’s events and where to serve, in one note. →</p>
            </a>
          )}
          <div className="info">
            <h3>Watching from home?</h3>
            <p>
              You’re part of this family too. <a href="/connect">Fill out a connect card</a> so we can say hello, or{' '}
              <a href="/prayer">send us a prayer request</a>.
            </p>
          </div>
          {info.givingLink && (
            <div className="info">
              <h3>Give online</h3>
              <p>
                Your generosity keeps the doors open and the stream running.{' '}
                <a href={info.givingLink} target="_blank" rel="noopener">
                  Give now →
                </a>
              </p>
            </div>
          )}
        </>
      }
    >
      <WatchRoom messages={messages} startId={sp.s} startAt={sp.t} />
    </FormShell>
  )
}
