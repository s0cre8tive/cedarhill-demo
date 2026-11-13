'use client'

import React, { useMemo, useState } from 'react'

export type Row = { id: string; name: string; stage: string; checkin: { id: string; how: string } | null }

export function CheckInBoard({ rows: initial, date, admin }: { rows: Row[]; date: string; admin: string }) {
  const [rows, setRows] = useState(initial)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const count = rows.filter((r) => r.checkin).length
  const list = useMemo(
    () => rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(Boolean(a.checkin)) - Number(Boolean(b.checkin)) || a.name.localeCompare(b.name)),
    [rows, q],
  )

  async function toggle(r: Row) {
    setBusy(r.id)
    setErr('')
    try {
      if (r.checkin) {
        const res = await fetch(`/api/attendance/${r.checkin.id}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) throw new Error()
        setRows((all) => all.map((x) => (x.id === r.id ? { ...x, checkin: null } : x)))
      } else {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person: /^\d+$/.test(r.id) ? Number(r.id) : r.id, date, how: 'staff' }),
        })
        const body = (await res.json().catch(() => ({}))) as { doc?: { id: string | number } }
        if (!res.ok || !body.doc) throw new Error()
        setRows((all) => all.map((x) => (x.id === r.id ? { ...x, checkin: { id: String(body.doc!.id), how: 'staff' } } : x)))
      }
    } catch {
      setErr('That didn’t save. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="ch-ci__board">
      <div className="ch-ci__bar">
        <input className="ch-ci__search" type="search" placeholder="Find someone by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find someone" />
        <p className="ch-ci__count">
          <b>{count}</b> checked in
        </p>
        <a className="ch-btn" href={`${admin}/collections/people/create`}>
          + Add someone new
        </a>
      </div>
      {err && <p className="ch-rc__err">{err}</p>}
      <div className="ch-ci__grid">
        {list.map((r) => (
          <button key={r.id} type="button" className={`ch-ci__p${r.checkin ? ' is-here' : ''}`} disabled={busy === r.id} onClick={() => toggle(r)} aria-pressed={Boolean(r.checkin)}>
            <span className="ch-ci__tick" aria-hidden="true">
              {r.checkin ? '✓' : ''}
            </span>
            <span className="ch-ci__who">
              <b>{r.name}</b>
              <small>{r.checkin ? (r.checkin.how === 'card' ? 'Here · connect card' : 'Here') : r.stage}</small>
            </span>
          </button>
        ))}
        {!list.length && <p className="ch-feed__empty">No one by that name yet. Add them with the button above.</p>}
      </div>
    </div>
  )
}
