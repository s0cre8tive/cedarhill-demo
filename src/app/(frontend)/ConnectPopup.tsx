'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { submitForm } from './actions'

type Props = { photo?: { url: string; alt: string } | null; caption?: string }

const KEY = 'ch-connect'
const SNOOZE_DAYS = 30
const DELAY_MS = 15000

function read(): { until?: number; joined?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
function write(v: { until?: number; joined?: boolean }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {}
}

/**
 * "Stay connected" sign-up. Opens once after 15 seconds or halfway down the page,
 * then stays away for 30 days after it's closed (or for good after someone signs up).
 * Sign-ups land in the Inbox and in People with the "Email list" tag.
 */
export function ConnectPopup({ photo, caption }: Props) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [started, setStarted] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const shown = useRef(false)

  // Decide when to show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const force = params.has('connect')
    const saved = read()
    if (!force && (saved.joined || (saved.until && saved.until > Date.now()))) return

    const show = () => {
      if (shown.current) return
      shown.current = true
      lastFocus.current = document.activeElement as HTMLElement | null
      setStarted(Date.now())
      setOpen(true)
    }
    if (force) {
      show()
      return
    }
    const timer = window.setTimeout(show, DELAY_MS)
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0 && window.scrollY / max > 0.5) show()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // While open: focus the form, keep Tab inside, close on Escape, stop the page scrolling.
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstRef.current?.focus(), 50)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'Tab' || !dialogRef.current) return
      const els = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"])')
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    if (!read().joined) write({ until: Date.now() + SNOOZE_DAYS * 86400000 })
    lastFocus.current?.focus?.()
  }

  if (!open) return null

  return (
    <div className="cp" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="cp__box" role="dialog" aria-modal="true" aria-labelledby="cp-title" ref={dialogRef}>
        <button type="button" className="cp__x" onClick={close} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {photo && (
          <div className="cp__ph">
            <img src={photo.url} alt="" />
            {caption && <span className="cp__cap">{caption}</span>}
          </div>
        )}
        <div className="cp__body">
          {done !== null ? (
            <div role="status">
              <p className="cp__kicker">You’re on the list</p>
              <h2 id="cp-title">Thank you{done ? `, ${done}` : ''}!</h2>
              <p className="cp__lede">Watch your inbox for what’s happening at Cedar Hill. We’re glad you’re here.</p>
              <div className="cp__actions">
                <a className="btn btn--violet" href="/visit" onClick={() => setOpen(false)}>
                  Plan a visit
                </a>
                <button type="button" className="btn btn--line" onClick={close}>
                  Back to the site
                </button>
              </div>
              <a className="cp__prayer" href="/prayer">
                Need prayer? Send a prayer request →
              </a>
            </div>
          ) : (
            <>
              <p className="cp__kicker">Stay connected</p>
              <h2 id="cp-title">Don’t miss what’s next</h2>
              <p className="cp__lede">Get a short note each week: events, new sermons and ways to serve in Maple Grove.</p>
              <form
                className="cp__form"
                onSubmit={(e) => {
                  e.preventDefault()
                  setError('')
                  const fd = new FormData(e.currentTarget)
                  start(async () => {
                    const res = await submitForm('connect', fd)
                    if (res.ok) {
                      write({ joined: true })
                      setDone(res.first)
                    } else setError(res.error)
                  })
                }}
              >
                <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <input type="hidden" name="_started" value={started || ''} />
                <input type="hidden" name="signup_from" value="Website pop-up" />
                <div className="cp__row">
                  <label>
                    <span>First name</span>
                    <input ref={firstRef} name="first_name" autoComplete="given-name" required maxLength={80} />
                  </label>
                  <label>
                    <span>
                      Last name <i>(optional)</i>
                    </span>
                    <input name="last_name" autoComplete="family-name" maxLength={80} />
                  </label>
                </div>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={200} />
                </label>
                {error && (
                  <p className="cp__err" role="alert">
                    {error}
                  </p>
                )}
                <button className="btn btn--violet cp__submit" type="submit" disabled={pending}>
                  {pending ? 'Signing you up…' : 'Sign me up'}
                </button>
                <p className="cp__fine">We’ll only use this for Cedar Hill updates. Unsubscribe any time.</p>
              </form>
              <a className="cp__prayer" href="/prayer">
                Need prayer? Send a prayer request →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
