'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { signUp } from '../actions'
import { Field } from './fields'

type Props = {
  kind: 'event' | 'serve'
  id: string
  guests?: number // max party size; omit for serve shifts
  submitLabel: string
  compact?: boolean
  onDone?: () => void
}

/** Name, email/phone and (for events) how many are coming. Used on event pages and the Serve page. */
export function SignUpForm({ kind, id, guests, submitLabel, compact }: Props) {
  const [done, setDone] = useState<null | { first: string; what: string }>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [started, setStarted] = useState(0)
  useEffect(() => setStarted(Date.now()), [])

  if (done) {
    return (
      <div className={`done${compact ? ' done--sm' : ''}`} role="status">
        <span className="done-ic">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2>{done.first ? `You’re in, ${done.first}!` : 'You’re in!'}</h2>
        <p>
          {done.what ? <b>{done.what}</b> : null}
          {done.what ? <br /> : null}
          We’ll send you a reminder the day before. Thank you!
        </p>
      </div>
    )
  }

  return (
    <form
      className={compact ? 'su su--sm' : 'su'}
      aria-label={submitLabel}
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const res = await signUp(kind, id, fd)
          if (res.ok) setDone({ first: res.first, what: res.what })
          else setError(res.error)
        })
      }}
    >
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="_started" value={started || ''} />
      <div className="row2">
        <Field label="First name" req>
          <input className="inp" type="text" name="first_name" autoComplete="given-name" required />
        </Field>
        <Field label="Last name" req>
          <input className="inp" type="text" name="last_name" autoComplete="family-name" required />
        </Field>
      </div>
      <div className="row2">
        <Field label="Email" hint="for your reminder">
          <input className="inp" type="email" name="email" autoComplete="email" />
        </Field>
        <Field label="Mobile phone" hint="or phone">
          <input className="inp" type="tel" name="phone" autoComplete="tel" inputMode="tel" />
        </Field>
      </div>
      {guests ? (
        <Field label="How many are coming, including you?">
          <select className="inp" name="guests" defaultValue="1">
            {Array.from({ length: Math.max(1, Math.min(guests, 8)) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="submit">
        <button className="btn btn-ink" type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        <p className="fine">We’ll only use this to remind you and say thanks.</p>
      </div>
    </form>
  )
}
