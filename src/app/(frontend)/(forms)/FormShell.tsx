import React from 'react'
import type { SiteInfo } from '@/lib/site'
import '../forms.css'

type Props = {
  decor: 'arc' | 'glow' | 'rays'
  kicker: string
  title: React.ReactNode
  lede: string
  extra?: React.ReactNode
  aside: React.ReactNode
  children: React.ReactNode
}

export const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="M11 18l-6-6 6-6" />
  </svg>
)

export function FormShell({ decor, kicker, title, lede, extra, aside, children }: Props) {
  return (
    <div className="fp">
      <div className="head">
        {decor === 'arc' && (
          <svg className="head-arc" viewBox="0 0 640 400" aria-hidden="true">
            <path d="M20 380 Q320 -120 620 380" />
            <path d="M60 380 Q320 -40 580 380" />
            <path d="M100 380 Q320 40 540 380" />
          </svg>
        )}
        {decor === 'glow' && <div className="glow" aria-hidden="true" />}
        {decor === 'rays' && <div className="rays" aria-hidden="true" />}
        <div className="nav">
          <a href="/" className="brand" aria-label="Cedar Hill Church home">
            <img className="emblem" src="/cedarhill-logo.png" alt="" />
            <span className="brand-mark">Cedar Hill</span>
          </a>
          <a className="back" href="/">
            <BackArrow />
            Back to home
          </a>
        </div>
        <div className="intro">
          <p className="kicker">{kicker}</p>
          <h1 className="h1">{title}</h1>
          <p className="lede">{lede}</p>
          {extra}
        </div>
      </div>
      <div className="body">
        <div className="card">{children}</div>
        <div className="aside">{aside}</div>
      </div>
      <div className="foot">Cedar Hill Church · demo site for Kingdom Kit. Cedar Hill is fictional.</div>
    </div>
  )
}

export function TimesCard({ info, title = 'When we gather' }: { info: SiteInfo; title?: string }) {
  return (
    <div className="info dark">
      <h3>{title}</h3>
      {info.services.map((s) => (
        <div className="trow" key={s.name + s.time}>
          <b>{s.name}</b>
          <span>{s.time}</span>
        </div>
      ))}
    </div>
  )
}

const LINKS = [
  ['/visit', 'Plan a visit'],
  ['/connect', 'Fill out a connect card'],
  ['/serve', 'Serve on a team'],
  ['/member', 'Become a member'],
  ['/salvation', 'I said yes to Jesus'],
  ['/prayer', 'Submit a prayer request'],
] as const

export function OtherSteps({ current }: { current: string }) {
  return (
    <div className="info">
      <h3>Other next steps</h3>
      {LINKS.filter(([h]) => h !== current).map(([h, l]) => (
        <a key={h} className="olink" href={h}>
          {l} <span aria-hidden="true">→</span>
        </a>
      ))}
    </div>
  )
}
