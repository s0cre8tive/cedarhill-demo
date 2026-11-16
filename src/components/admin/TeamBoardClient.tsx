'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { refreshBell } from './BellClient'
import { ago, api, TYPE_LABEL } from './teamUi'

export type BoardItem = {
  id: string
  title: string
  body: string
  link: string
  file: { url: string; name: string } | null
  author: string
  createdAt: string
  pinned: boolean
  audience: string
  campusIds: string[]
  mine: boolean
  read: boolean
  showCounts: boolean
  seen: number
  of: number
  canManage: boolean
  reminded: boolean
  editHref: string
}
export type BoardNote = { id: string; type: string; title: string; body: string; link: string; createdAt: string; unread: boolean }

type Props = {
  admin: string
  items: BoardItem[]
  notes: BoardNote[]
  unread: number
  teams: Array<{ id: string; name: string }>
  campuses: Array<{ id: string; name: string }>
  canPost: boolean
  canSeeAll: boolean
}
type Seen = { read: string[]; unread: string[]; reminded: string | null }

export function TeamBoardClient({ admin, items: initial, notes, unread, teams, campuses, canPost, canSeeAll }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [campus, setCampus] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [seen, setSeen] = useState<Record<string, Seen>>({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [focus, setFocus] = useState('')

  useEffect(() => setItems(initial), [initial])

  // Email links land on /admin?a=<id>: bring that announcement into view.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('a')
    if (!id) return
    setFocus(id)
    document.getElementById(`ann-${id}`)?.scrollIntoView({ block: 'center' })
  }, [])

  const shown = campus ? items.filter((i) => !i.campusIds.length || i.campusIds.includes(campus)) : items

  async function markRead(id: string) {
    setBusy(id)
    try {
      const res = await api<{ seen: number; of: number }>(`/api/team-announcements/${id}/read`, { method: 'POST' })
      setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true, seen: res.seen, of: res.of } : i)))
      refreshBell()
      router.refresh()
    } catch (err) {
      setMsg({ id, text: (err as Error).message, ok: false })
    }
    setBusy('')
  }

  async function toggleSeen(id: string) {
    if (open === id) return setOpen(null)
    setOpen(id)
    try {
      const res = await api<Seen>(`/api/team-announcements/${id}/seen`)
      setSeen((s) => ({ ...s, [id]: res }))
    } catch (err) {
      setMsg({ id, text: (err as Error).message, ok: false })
    }
  }

  async function remind(id: string) {
    setBusy(id)
    try {
      const res = await api<{ reminded: number; at: string }>(`/api/team-announcements/${id}/remind`, { method: 'POST' })
      setItems((list) => list.map((i) => (i.id === id ? { ...i, reminded: true } : i)))
      setSeen((s) => (s[id] ? { ...s, [id]: { ...s[id], reminded: res.at } } : s))
      setMsg({ id, text: `Reminder sent to ${res.reminded} ${res.reminded === 1 ? 'person' : 'people'}.`, ok: true })
    } catch (err) {
      setMsg({ id, text: (err as Error).message, ok: false })
    }
    setBusy('')
  }

  async function openNote(n: BoardNote) {
    if (n.unread) {
      await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id: n.id }) }).catch(() => null)
      refreshBell()
    }
    window.location.assign(n.link)
  }

  return (
    <div className="ch-team" id="team-board">
      <section className="ch-team__board" aria-label="Team announcements">
        <div className="ch-team__top">
          <h2>Team announcements</h2>
          <div className="ch-team__tools">
            {campuses.length > 0 && (
              <label className="ch-team__filter">
                <span>Campus</span>
                <select value={campus} onChange={(e) => setCampus(e.target.value)}>
                  <option value="">All campuses</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canPost && (
              <a className="ch-team__btn ch-team__btn--go" href={`${admin}/collections/team-announcements/create`}>
                Post to your team
              </a>
            )}
          </div>
        </div>

        {shown.length === 0 && <p className="ch-team__empty">Nothing on the board right now. When someone posts to your team, it shows here.</p>}

        {shown.map((a) => {
          const all = a.showCounts && a.of > 0 && a.seen >= a.of
          const list = seen[a.id]
          return (
            <article key={a.id} id={`ann-${a.id}`} className={`ch-ann${a.read ? '' : ' is-unread'}${focus === a.id ? ' is-focus' : ''}`}>
              <header className="ch-ann__head">
                {!a.read && <span className="ch-dot" title="You haven’t read this yet" />}
                <h3>{a.title}</h3>
                {a.pinned && <span className="ch-chip ch-chip--violet">Pinned</span>}
              </header>
              {a.body && <p className="ch-ann__body">{a.body}</p>}
              {(a.link || a.file) && (
                <p className="ch-ann__links">
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer">
                      Open the link ↗
                    </a>
                  )}
                  {a.file && (
                    <a href={a.file.url} target="_blank" rel="noopener noreferrer">
                      {a.file.name} ↗
                    </a>
                  )}
                </p>
              )}
              <footer className="ch-ann__foot">
                <span className="ch-ann__meta">
                  {a.mine ? 'You' : a.author} · {ago(a.createdAt)} · For: {a.audience}
                </span>
                <span className="ch-ann__acts">
                  {a.showCounts &&
                    a.of > 0 &&
                    (a.canManage ? (
                      <button type="button" className={`ch-seen${all ? ' is-all' : ''}`} onClick={() => toggleSeen(a.id)} aria-expanded={open === a.id}>
                        {all ? `Read by all ${a.of}` : `Seen by ${a.seen} of ${a.of}`}
                      </button>
                    ) : (
                      <span className={`ch-seen ch-seen--plain${all ? ' is-all' : ''}`}>{all ? `Read by all ${a.of}` : `Seen by ${a.seen} of ${a.of}`}</span>
                    ))}
                  {a.editHref && (
                    <a className="ch-ann__edit" href={a.editHref}>
                      Edit
                    </a>
                  )}
                  {!a.read && (
                    <button type="button" className="ch-team__btn" disabled={busy === a.id} onClick={() => markRead(a.id)}>
                      {busy === a.id ? 'Saving…' : 'Mark as read'}
                    </button>
                  )}
                  {a.read && !a.mine && <span className="ch-ann__done">✓ You’ve read this</span>}
                </span>
              </footer>

              {open === a.id && (
                <div className="ch-seenlist">
                  {!list ? (
                    <p>Loading…</p>
                  ) : (
                    <>
                      <div>
                        <strong>Still to read ({list.unread.length})</strong>
                        <p>{list.unread.length ? list.unread.join(', ') : 'Everyone has read it.'}</p>
                      </div>
                      <div>
                        <strong>Read ({list.read.length})</strong>
                        <p>{list.read.length ? list.read.join(', ') : 'No one yet.'}</p>
                      </div>
                      {list.unread.length > 0 &&
                        (a.reminded || list.reminded ? (
                          <p className="ch-seenlist__note">A reminder has gone out. (One reminder per announcement.)</p>
                        ) : (
                          <button type="button" className="ch-team__btn ch-team__btn--go" disabled={busy === a.id} onClick={() => remind(a.id)}>
                            {busy === a.id ? 'Sending…' : `Send one reminder to ${list.unread.length === 1 ? 'this person' : `these ${list.unread.length}`}`}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              )}
              {msg?.id === a.id && <p className={`ch-team__msg${msg.ok ? ' is-ok' : ''}`}>{msg.text}</p>}
            </article>
          )
        })}

        {canSeeAll && items.length > 0 && (
          <a className="ch-team__all" href={`${admin}/collections/team-announcements`}>
            See all team announcements →
          </a>
        )}
      </section>

      <aside className="ch-team__side" aria-label="My notifications">
        <div className="ch-team__top">
          <h2>
            My notifications
            {unread > 0 && <b className="ch-team__count">{unread}</b>}
          </h2>
          <a href={`${admin}/notifications`}>See all →</a>
        </div>
        {notes.length === 0 ? (
          <p className="ch-team__empty">You’re all caught up. Mentions, replies and team announcements land here.</p>
        ) : (
          notes.map((n) => (
            <button key={n.id} type="button" className={`ch-note${n.unread ? ' is-unread' : ''}`} onClick={() => openNote(n)}>
              <span className="ch-note__type">
                {n.unread && <span className="ch-dot" />}
                {TYPE_LABEL[n.type] ?? 'Update'} · {ago(n.createdAt)}
              </span>
              <span className="ch-note__title">{n.title}</span>
              {n.type !== 'announcement' && n.type !== 'reminder' && n.body && <span className="ch-note__body">{n.body}</span>}
            </button>
          ))
        )}
        {teams.length > 0 && (
          <div className="ch-team__mine">
            <strong>My teams</strong>
            <div>
              {teams.map((t) => (
                <a key={t.id} href={`${admin}/teams/${t.id}`}>
                  {t.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
