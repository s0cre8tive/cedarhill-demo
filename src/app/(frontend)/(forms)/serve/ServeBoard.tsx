'use client'

import React, { useMemo, useState } from 'react'
import { SignUpForm } from '../SignUpForm'

export type Shift = { id: string; team: string; blurb: string; day: string; time: string; notes: string; spots: number; left: number }

/** Upcoming shifts by day. Tap one to sign up right there. */
export function ServeBoard({ shifts }: { shifts: Shift[] }) {
  const [team, setTeam] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const teams = useMemo(() => ['All', ...Array.from(new Set(shifts.map((s) => s.team)))], [shifts])
  const list = shifts.filter((s) => team === 'All' || s.team === team)
  const days = list.reduce<Array<[string, Shift[]]>>((acc, s) => {
    const last = acc[acc.length - 1]
    if (last && last[0] === s.day) last[1].push(s)
    else acc.push([s.day, [s]])
    return acc
  }, [])

  if (!shifts.length) return <p className="sv-empty">The next schedule is coming soon. Check back this week!</p>

  return (
    <div className="sv">
      <div className="chips" role="group" aria-label="Filter by team">
        {teams.map((t) => (
          <label className="chip" key={t}>
            <input type="radio" name="team" checked={team === t} onChange={() => setTeam(t)} />
            <span>{t}</span>
          </label>
        ))}
      </div>
      {days.map(([day, items]) => (
        <section className="sv-day" key={day}>
          <h2>{day}</h2>
          {items.map((s) => (
            <div className={`sv-shift${open === s.id ? ' is-open' : ''}`} key={s.id}>
              <div className="sv-row">
                <div className="sv-what">
                  <b>{s.team}</b>
                  <span>{[s.time, s.notes].filter(Boolean).join(' · ') || s.blurb}</span>
                </div>
                <div className="sv-meter" aria-label={`${s.spots - s.left} of ${s.spots} filled`}>
                  {Array.from({ length: s.spots }, (_, i) => (
                    <i key={i} className={i < s.spots - s.left ? 'on' : ''} />
                  ))}
                  <small>{s.left ? `${s.left} open` : 'Full'}</small>
                </div>
                {s.left > 0 ? (
                  <button type="button" className="btn btn-line sv-btn" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    {open === s.id ? 'Close' : 'Sign up'}
                  </button>
                ) : (
                  <span className="sv-full">Thank you!</span>
                )}
              </div>
              {open === s.id && (
                <div className="sv-form">
                  <SignUpForm kind="serve" id={s.id} submitLabel={`Serve with ${s.team}`} compact />
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
