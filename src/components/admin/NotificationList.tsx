'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { refreshBell } from './BellClient'
import type { BoardNote } from './TeamBoardClient'
import { ago, api, TYPE_LABEL } from './teamUi'

export function NotificationList({ notes: initial }: { notes: BoardNote[] }) {
  const router = useRouter()
  const [notes, setNotes] = useState(initial)
  const [only, setOnly] = useState(false)
  const unread = notes.filter((n) => n.unread).length
  const shown = only ? notes.filter((n) => n.unread) : notes

  async function open(n: BoardNote) {
    if (n.unread) {
      await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id: n.id }) }).catch(() => null)
      refreshBell()
    }
    window.location.assign(n.link)
  }

  async function readAll() {
    await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ all: true }) }).catch(() => null)
    setNotes((list) => list.map((n) => ({ ...n, unread: false })))
    refreshBell()
    router.refresh()
  }

  return (
    <div className="ch-notes">
      <div className="ch-notes__bar">
        <label className="ch-pipe__check">
          <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only show what I haven’t read ({unread})
        </label>
        {unread > 0 && (
          <button type="button" className="ch-team__btn" onClick={readAll}>
            Mark all as read
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="ch-team__empty">{only ? 'Nothing waiting on you.' : 'Nothing here yet. Mentions, replies and team announcements will show up here.'}</p>
      ) : (
        shown.map((n) => (
          <button key={n.id} type="button" className={`ch-note ch-note--wide${n.unread ? ' is-unread' : ''}`} onClick={() => open(n)}>
            <span className="ch-note__type">
              {n.unread && <span className="ch-dot" />}
              {TYPE_LABEL[n.type] ?? 'Update'} · {ago(n.createdAt)}
            </span>
            <span className="ch-note__title">{n.title}</span>
            {n.body && <span className="ch-note__body">{n.body}</span>}
          </button>
        ))
      )}
    </div>
  )
}
