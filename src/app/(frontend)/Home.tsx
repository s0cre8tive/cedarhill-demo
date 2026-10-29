'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { HomeData, Photo } from '@/lib/site'

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)
const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
)

const Img = ({ p, eager }: { p: Photo | null; eager?: boolean }) =>
  p ? <img src={p.url} alt={p.alt} loading={eager ? 'eager' : 'lazy'} /> : null

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const o = (x: Intl.DateTimeFormatOptions) => d.toLocaleString('en-US', { ...x, timeZone: 'UTC' })
  return {
    month: o({ month: 'short' }),
    day: o({ day: 'numeric' }),
    weekday: o({ weekday: 'long' }),
    long: o({ month: 'long', day: 'numeric' }),
  }
}

const youTubeThumb = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([\w-]{11})/)
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null
}

const initials = (name: string) =>
  name
    .replace(/^(Pastor|Rev\.?|Dr\.?)\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    try {
      setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    } catch {}
  }, [])
  return r
}

function useScrollY(off: boolean) {
  const [y, setY] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setY(window.scrollY)
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    on()
    return () => {
      window.removeEventListener('scroll', on)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return off ? Math.min(y, 1) : y
}

export default function Home({ data }: { data: HomeData }) {
  const { info, announcement, events, sermons, leaders, ministries, photos } = data
  const reduce = useReducedMotion()
  const y = useScrollY(reduce)
  const [menuOpen, setMenuOpen] = useState(false)

  // Header slideshow
  const slides = photos.heroes
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (reduce || !playing || slides.length < 2) return
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6500)
    return () => clearInterval(t)
  }, [reduce, playing, slides.length])

  // Events slider
  const rail = useRef<HTMLDivElement | null>(null)
  const nudge = (dir: number) => {
    const el = rail.current
    if (!el) return
    const card = el.querySelector('.ev-card') as HTMLElement | null
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 360) + 24), behavior: reduce ? 'auto' : 'smooth' })
  }

  const sunday = info.services[0]
  const [latest, ...older] = sermons
  const latestArt = latest?.video ? youTubeThumb(latest.video) : null

  const nav: Array<[string, string]> = [
    ['/#about', 'About'],
    ['/#ministries', 'Ministries'],
    ['/#events', 'Events'],
    ['/#watch', 'Watch'],
    ['/#visit', 'Visit'],
  ]

  const ctas: Array<[string, string, boolean]> = [
    ['/visit', 'Plan your visit', true],
    [latest?.video || info.liveLink || '/#watch', 'Watch online', false],
    ['/member', 'Get connected', false],
  ]

  const steps: Array<[string, string, string]> = [
    ['/visit', 'Plan your first visit', 'Tell us you’re coming and someone will save you a seat and meet you at the door.'],
    ['/member', 'Make Cedar Hill home', 'Ready to belong? Start membership and we’ll connect you with a ministry.'],
    ['/salvation', 'I said yes to Jesus', 'Tell us about your decision so we can celebrate and help with what comes next.'],
    ['/prayer', 'Ask for prayer', 'Share what’s on your heart. Our prayer team reads every request.'],
  ]

  const solid = y > 40 || menuOpen

  return (
    <div className="ch">
      {announcement && (
        <div className="ann" role="region" aria-label="Announcement">
          <p>{announcement.message}</p>
          {announcement.linkUrl && <a href={announcement.linkUrl}>{announcement.linkText || 'Learn more'}</a>}
        </div>
      )}

      <header className={`nav${solid ? ' nav--solid' : ''}`}>
        <div className="nav__in">
          <a className="brand" href="/" aria-label="Cedar Hill Church home">
            <img src="/cedarhill-logo.png" alt="" width={44} height={44} />
            <span>Cedar Hill</span>
          </a>
          <nav className="nav__links" aria-label="Primary">
            {nav.map(([h, l]) => (
              <a key={h} href={h}>
                {l}
              </a>
            ))}
          </nav>
          <div className="nav__cta">
            {info.givingLink && (
              <a className="btn btn--white btn--sm" href={info.givingLink} target="_blank" rel="noopener">
                Give
              </a>
            )}
            <button className="nav__menu" type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h10'} />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="nav__mobile" aria-label="Mobile">
            {nav.map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)}>
                {l}
              </a>
            ))}
            {info.givingLink && <a href={info.givingLink}>Give</a>}
          </nav>
        )}
      </header>

      {/* HERO — full-bleed photo slideshow */}
      <section className="hero" aria-label="Welcome">
        <div className="hero__media" style={{ transform: `translate3d(0, ${Math.round(y * 0.35)}px, 0)` }}>
          {slides.map((p, i) => (
            <div key={p.url + i} className={`hero__slide${i === slide ? ' is-on' : ''}`} aria-hidden={i !== slide}>
              <Img p={p} eager={i === 0} />
            </div>
          ))}
        </div>
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__in" style={{ opacity: reduce ? 1 : Math.max(0, 1 - y / 700) }}>
          <p className="hero__welcome">Welcome to Cedar Hill Church</p>
          <h1>
            <span>Deep roots.</span>
            <span>Open doors.</span>
          </h1>
          <p className="hero__sub">A church family in Maple Grove for people who are curious, tired, hopeful or all three.</p>
          <div className="hero__ctas">
            {ctas.map(([h, l, primary]) => (
              <a key={l} className={`btn ${primary ? 'btn--violet' : 'btn--glass'}`} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener">
                {l}
                {primary && <Arrow />}
              </a>
            ))}
          </div>
        </div>
        {slides.length > 1 && (
          <div className="hero__ctrl">
            <div className="hero__dots" role="tablist" aria-label="Header photos">
              {slides.map((p, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === slide} aria-label={`Photo ${i + 1} of ${slides.length}`} onClick={() => setSlide(i)} className={i === slide ? 'is-on' : ''}>
                  <i style={{ animationPlayState: playing && !reduce ? 'running' : 'paused' }} />
                </button>
              ))}
            </div>
            {!reduce && (
              <button type="button" className="hero__pause" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {playing ? (
                    <>
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </>
                  ) : (
                    <path d="M8 5.5v13l11-6.5z" />
                  )}
                </svg>
              </button>
            )}
          </div>
        )}
      </section>

      {/* SERVICE TIMES */}
      <section className="times" aria-label="Service times">
        <div className="wrap times__in">
          <p className="times__lead">
            <b>Join us this week</b>
            <span>
              {info.street}, {info.cityLine.split(',')[0]}
            </span>
          </p>
          <ul>
            {info.services.map((s) => (
              <li key={s.name + s.time}>
                <span>{s.day ? `${s.day}s` : s.name}</span>
                <b>{s.time}</b>
                <small>{s.name}</small>
              </li>
            ))}
          </ul>
          <a className="btn btn--violet btn--sm" href="/visit">
            Plan your visit
          </a>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about">
        <div className="wrap about__in">
          <h2>A church you can grow up in.</h2>
          <div className="about__text">
            <p>
              Cedars grow slowly and live for centuries. We think faith works the same way: rooted in Scripture, held together by
              people who show up for each other, and strong enough to give shade to the whole neighborhood.
            </p>
            <p>Sundays are a little loud, the coffee is good, and the kids’ rooms are checked in and safe. You don’t need to know anything to belong here.</p>
            <a className="link" href="#pastors">
              Meet our pastors <Arrow />
            </a>
          </div>
        </div>
        <div className="wrap about__ph">
          {photos.gallery.map((p, i) => (
            <figure key={i}>
              <Img p={p} />
              {p?.caption && <figcaption>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </section>

      {/* EVENTS — sliding cards */}
      <section id="events" className="events">
        <div className="wrap">
          <div className="head">
            <h2>Events</h2>
            {events.length > 1 && (
              <div className="rail-btns">
                <button type="button" onClick={() => nudge(-1)} aria-label="Previous events">
                  <Chevron left />
                </button>
                <button type="button" onClick={() => nudge(1)} aria-label="Next events">
                  <Chevron />
                </button>
              </div>
            )}
          </div>
          {events.length ? (
            <div className="rail" ref={rail} tabIndex={0} aria-label="Upcoming events">
              {events.map((e) => {
                const d = fmtDate(e.date)
                return (
                  <article className="ev-card" key={e.id}>
                    <div className="ev-card__ph">
                      <Img p={e.image} />
                      <span className="ev-card__date">
                        <small>{d.month}</small>
                        <b>{d.day}</b>
                      </span>
                    </div>
                    <div className="ev-card__body">
                      {e.ministry && <p className="ev-card__min">{e.ministry}</p>}
                      <h3>{e.title}</h3>
                      <p className="ev-card__when">
                        {d.weekday}
                        {e.time ? `, ${e.time}` : ''}
                      </p>
                      {e.location && <p className="ev-card__where">{e.location}</p>}
                      {e.details && <p className="ev-card__details">{e.details}</p>}
                      {e.link && (
                        <a className="link" href={e.link} target="_blank" rel="noopener">
                          More information <Arrow />
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="empty">
              Nothing special on the calendar this month. Join us {sunday ? `${sunday.day ? sunday.day + 's' : ''} at ${sunday.time}` : 'on Sunday'}.
            </p>
          )}
        </div>
      </section>

      {/* MINISTRIES — photo tiles */}
      {ministries.length > 0 && (
        <section id="ministries" className="ministries">
          <div className="wrap">
            <div className="head">
              <h2>Find your people</h2>
              <p>Every age and stage has a place to plug in.</p>
            </div>
            <div className="tiles">
              {ministries.map((m) => (
                <article className="tile" key={m.id}>
                  <Img p={m.photo} />
                  <div className="tile__shade" aria-hidden="true" />
                  <div className="tile__body">
                    <h3>{m.name}</h3>
                    {m.tagline && <p className="tile__tag">{m.tagline}</p>}
                    {m.meets && <p className="tile__meets">{m.meets}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WATCH */}
      {latest && (
        <section id="watch" className="watch">
          <div className="wrap watch__in">
            <div className="watch__copy">
              <p className="watch__label">Latest sermon</p>
              <h2>{latest.title}</h2>
              <p className="watch__by">
                {latest.preacher}
                {latest.scripture ? `, ${latest.scripture}` : ''} · {fmtDate(latest.date).long}
              </p>
              {latest.summary && <p className="watch__sum">{latest.summary}</p>}
              <div className="watch__btns">
                {latest.video ? (
                  <a className="btn btn--white" href={latest.video} target="_blank" rel="noopener">
                    Watch the sermon <Arrow />
                  </a>
                ) : (
                  <p className="watch__soon">Video coming soon.</p>
                )}
              </div>
              {older.length > 0 && (
                <ul className="watch__older" aria-label="Earlier sermons">
                  {older.map((s) => (
                    <li key={s.id}>
                      {s.video ? (
                        <a href={s.video} target="_blank" rel="noopener">
                          {s.title}
                        </a>
                      ) : (
                        <span>{s.title}</span>
                      )}
                      <time>{fmtDate(s.date).long}</time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <a className="watch__art" href={latest.video || undefined} target={latest.video ? '_blank' : undefined} rel="noopener" aria-label={latest.video ? `Watch ${latest.title}` : undefined}>
              {latestArt ? <img src={latestArt} alt="" loading="lazy" /> : <Img p={photos.sermon} />}
              <span className="watch__play" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
            </a>
          </div>
        </section>
      )}

      {/* NEXT STEPS */}
      <section className="steps">
        <div className="wrap">
          <div className="head">
            <h2>Take a next step</h2>
            <p>Each takes about two minutes, and a real person reads every one.</p>
          </div>
          <ul className="steps__list">
            {steps.map(([href, title, text]) => (
              <li key={href}>
                <a href={href}>
                  <b>{title}</b>
                  <span>{text}</span>
                  <i aria-hidden="true">
                    <Arrow />
                  </i>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PASTORS */}
      {leaders.length > 0 && (
        <section id="pastors" className="pastors">
          <div className="wrap">
            <div className="head">
              <h2>Our pastors</h2>
              <p>Say hi after service. They’ll probably remember your name by week two.</p>
            </div>
            <div className="pastor-grid">
              {leaders.map((l, i) => (
                <article className="pastor" key={l.id}>
                  <div className={`pastor__ph pastor__ph--${(i % 3) + 1}`}>
                    {l.photo ? <img src={l.photo.url} alt={l.photo.alt || l.name} loading="lazy" /> : <span aria-hidden="true">{initials(l.name)}</span>}
                  </div>
                  <h3>{l.name}</h3>
                  {l.title && <p className="pastor__title">{l.title}</p>}
                  {l.bio && <p className="pastor__bio">{l.bio}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VISIT */}
      <section id="visit" className="visit">
        <div className="visit__ph">
          <Img p={photos.visit} />
        </div>
        <div className="visit__copy">
          <h2>Your first Sunday</h2>
          <p>
            Park anywhere in the front lot and look for the people in green lanyards. They’ll walk you to kids’ check-in, point you
            to coffee and help you find a seat. Services last about 75 minutes.
          </p>
          <dl className="visit__facts">
            <div>
              <dt>Where</dt>
              <dd>
                {info.street}
                <br />
                {info.cityLine}
              </dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>
                <a href={info.phoneHref}>{info.phone}</a>
                {info.email && (
                  <>
                    <br />
                    <a href={`mailto:${info.email}`}>{info.email}</a>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <div className="visit__btns">
            <a className="btn btn--violet" href="/visit">
              Plan your visit <Arrow />
            </a>
            <a className="btn btn--line" href={info.mapLink} target="_blank" rel="noopener">
              Get directions
            </a>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="foot__grid">
            <div className="foot__brand">
              <a className="brand" href="/">
                <img src="/cedarhill-logo.png" alt="" width={56} height={56} />
                <span>Cedar Hill Church</span>
              </a>
              <p>
                {info.street}
                <br />
                {info.cityLine}
                <br />
                {info.phone}
              </p>
              {info.givingLink && (
                <a className="btn btn--white btn--sm" href={info.givingLink} target="_blank" rel="noopener">
                  Give online
                </a>
              )}
            </div>
            <nav aria-label="Church">
              <b>Church</b>
              <a href="/#about">About</a>
              <a href="/#pastors">Our pastors</a>
              <a href="/#watch">Sermons</a>
              <a href="/admin">Staff sign-in</a>
            </nav>
            <nav aria-label="Get involved">
              <b>Get involved</b>
              <a href="/#ministries">Ministries</a>
              <a href="/#events">Events</a>
              <a href="/member">Become a member</a>
            </nav>
            <nav aria-label="Connect">
              <b>Connect</b>
              <a href="/visit">Plan a visit</a>
              <a href="/prayer">Prayer request</a>
              <a href="/salvation">I said yes to Jesus</a>
            </nav>
          </div>
          <p className="foot__demo">
            Demo site for <b>EZEdit Mission</b>. Cedar Hill Church and everyone named here are fictional. Photos from Unsplash.
          </p>
        </div>
      </footer>
    </div>
  )
}
