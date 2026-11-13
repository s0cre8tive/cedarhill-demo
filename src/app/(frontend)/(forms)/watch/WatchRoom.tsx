'use client'

import React, { useMemo, useState } from 'react'

export type Message = {
  id: string
  title: string
  preacher: string
  scripture: string
  series: string
  summary: string
  date: string
  video: string
  yt: string | null
  clips: Array<{ title: string; at: string }>
}

/** "12:30" or "1:02:05" → seconds */
const secs = (at?: string | null) =>
  String(at ?? '')
    .split(':')
    .map(Number)
    .reduce((t, n) => (Number.isFinite(n) ? t * 60 + n : t), 0)

const thumb = (m: Message) => (m.yt ? `https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg` : null)

export function WatchRoom({ messages, startId, startAt }: { messages: Message[]; startId?: string; startAt?: string }) {
  const first = messages.find((m) => m.id === startId) ?? messages[0]
  const [cur, setCur] = useState(first?.id)
  const [at, setAt] = useState(startId ? secs(startAt) : 0)
  const [playing, setPlaying] = useState(Boolean(startId && startAt))
  const [series, setSeries] = useState('All')
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState('')

  const m = messages.find((x) => x.id === cur) ?? first
  const allSeries = useMemo(() => ['All', ...Array.from(new Set(messages.map((x) => x.series).filter(Boolean)))], [messages])
  const list = messages.filter(
    (x) =>
      (series === 'All' || x.series === series) &&
      (!q || `${x.title} ${x.scripture} ${x.preacher} ${x.series}`.toLowerCase().includes(q.toLowerCase())),
  )

  if (!m) return <p className="sv-empty">The first message is coming soon.</p>

  const play = (id: string, t = 0) => {
    setCur(id)
    setAt(t)
    setPlaying(true)
    try {
      document.getElementById('wt-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch {}
  }
  const share = async (clip: { title: string; at: string }) => {
    const url = `${location.origin}/watch?s=${m.id}&t=${encodeURIComponent(clip.at)}`
    try {
      if (navigator.share) await navigator.share({ title: clip.title, url })
      else await navigator.clipboard.writeText(url)
      setCopied(clip.at)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  return (
    <div className="wt">
      <div className="wt-player" id="wt-player">
        {m.yt && playing ? (
          <iframe
            key={`${m.id}-${at}`}
            src={`https://www.youtube-nocookie.com/embed/${m.yt}?autoplay=1&rel=0&start=${at}`}
            title={m.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : m.yt ? (
          <button type="button" className="wt-poster" onClick={() => setPlaying(true)} aria-label={`Play ${m.title}`}>
            <img src={thumb(m)!} alt="" />
            <span className="wt-play" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </button>
        ) : (
          <div className="wt-poster wt-soon">
            <p>Video coming soon</p>
          </div>
        )}
      </div>
      <div className="wt-now">
        {m.series && <p className="wt-series">{m.series}</p>}
        <h2>{m.title}</h2>
        <p className="wt-by">{[m.preacher, m.scripture, m.date].filter(Boolean).join(' · ')}</p>
        {m.summary && <p className="wt-sum">{m.summary}</p>}
      </div>

      {m.clips.length > 0 && (
        <div className="wt-clips">
          <h3>Short clips</h3>
          <ul>
            {m.clips.map((c) => (
              <li key={c.at + c.title}>
                <button type="button" className="wt-clip" onClick={() => play(m.id, secs(c.at))}>
                  <span className="wt-at">{c.at}</span>
                  <span className="wt-ct">{c.title}</span>
                </button>
                <button type="button" className="wt-share" onClick={() => share(c)} aria-label={`Share the clip “${c.title}”`}>
                  {copied === c.at ? 'Copied!' : 'Share'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="wt-lib">
        <div className="wt-libhead">
          <h3>All messages</h3>
          <input className="inp wt-search" type="search" placeholder="Search by title or scripture" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" />
        </div>
        {allSeries.length > 2 && (
          <div className="chips" role="group" aria-label="Series">
            {allSeries.map((s) => (
              <label className="chip" key={s}>
                <input type="radio" name="series" checked={series === s} onChange={() => setSeries(s)} />
                <span>{s === 'All' ? 'All series' : s}</span>
              </label>
            ))}
          </div>
        )}
        <div className="wt-grid">
          {list.map((x) => (
            <button type="button" key={x.id} className={`wt-card${x.id === m.id ? ' is-on' : ''}`} onClick={() => play(x.id)}>
              <span className="wt-cimg">{thumb(x) ? <img src={thumb(x)!} alt="" loading="lazy" /> : null}</span>
              <span className="wt-cmeta">
                {x.series && <small>{x.series}</small>}
                <b>{x.title.replace(new RegExp(`^${x.series}:\\s*`), '')}</b>
                <span>{[x.scripture, x.date].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          ))}
          {!list.length && <p className="sv-empty">No messages match that search.</p>}
        </div>
      </div>
    </div>
  )
}
