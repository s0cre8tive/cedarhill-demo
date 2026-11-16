'use client'

import React, { useCallback, useEffect, useState } from 'react'

/** Tell the bell to recount, e.g. after something is marked as read. */
export const refreshBell = () => window.dispatchEvent(new Event('ch-notes-changed'))

/**
 * Unread count for "My notifications". Checks when the page loads, when you come back
 * to the tab, and once a minute. (No live connection needed.)
 */
export function BellClient() {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count?where[readAt][exists]=false', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { totalDocs?: number }
      setCount(body.totalDocs ?? 0)
    } catch {
      /* try again on the next tick */
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 60_000)
    const onShow = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('ch-notes-changed', load)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('ch-notes-changed', load)
    }
  }, [load])

  return (
    <a className={`ch-bell${count ? ' has-unread' : ''}`} href="/admin/notifications" aria-label={count ? `My notifications, ${count} unread` : 'My notifications'}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {count > 0 && <b className="ch-bell__n">{count > 99 ? '99+' : count}</b>}
    </a>
  )
}
