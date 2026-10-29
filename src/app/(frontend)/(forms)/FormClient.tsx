'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { submitForm } from '../actions'

type Props = {
  type: 'visit' | 'member' | 'salvation' | 'prayer'
  label: string
  submitLabel: string
  fine: string
  successTitle: string // use {name} for the person's first name
  successText: string
  secondary?: { href: string; label: string }
  children: React.ReactNode
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)

export function FormClient({ type, label, submitLabel, fine, successTitle, successText, secondary, children }: Props) {
  const [sent, setSent] = useState<null | string>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [key, setKey] = useState(0)
  const [started, setStarted] = useState(0)
  useEffect(() => setStarted(Date.now()), [key])

  if (sent !== null) {
    return (
      <div className="done" role="status">
        <span className="done-ic">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2>{successTitle.replace('{name}', sent || 'friend')}</h2>
        <p>{successText}</p>
        <div className="done-btns">
          <a className="btn btn-ink" href="/">
            Back to home
          </a>
          {secondary ? (
            <a className="btn btn-line" href={secondary.href}>
              {secondary.label}
            </a>
          ) : (
            <button
              className="btn btn-line"
              type="button"
              onClick={() => {
                setSent(null)
                setKey((k) => k + 1)
              }}
            >
              Submit another
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form
      key={key}
      method="post"
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const res = await submitForm(type, fd)
          if (res.ok) {
            setSent(res.first)
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            } catch {}
          } else setError(res.error)
        })
      }}
    >
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="_started" value={started || ''} />
      {children}
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="submit">
        <button className="btn btn-ink" type="submit" disabled={pending}>
          {pending ? 'Sending…' : submitLabel} <Arrow />
        </button>
        <p className="fine">{fine}</p>
      </div>
    </form>
  )
}
