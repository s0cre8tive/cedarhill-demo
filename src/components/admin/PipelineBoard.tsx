'use client'

import React, { useMemo, useState } from 'react'
import { STAGES } from '../../lib/stages'

export type Card = {
  id: string
  name: string
  stage: string
  tags: { id: string; name: string }[]
  assignee: { id: string; name: string } | null
  nextDue: string | null
  openCount: number
}

type Props = { admin: string; cards: Card[]; tags: { id: string; name: string }[]; me: string }

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const isOverdue = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  return d.toISOString().slice(0, 10) < today.toISOString().slice(0, 10)
}
const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export function PipelineBoard({ admin, cards: initial, tags, me }: Props) {
  const [cards, setCards] = useState(initial)
  const [tag, setTag] = useState('')
  const [mine, setMine] = useState(false)
  const [msg, setMsg] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const shown = useMemo(
    () => cards.filter((c) => (!tag || c.tags.some((t) => t.id === tag)) && (!mine || c.assignee?.id === me)),
    [cards, tag, mine, me],
  )

  async function move(id: string, stage: string) {
    const card = cards.find((c) => c.id === id)
    if (!card || card.stage === stage) return
    const before = card.stage
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)))
    const label = STAGES.find((s) => s.value === stage)?.label
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setMsg(`${card.name} moved to ${label}.`)
    } catch {
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage: before } : c)))
      setMsg(`Couldn’t move ${card.name}. Please try again.`)
    }
  }

  const exportHref = `/api/people/export${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`

  return (
    <>
      <div className="ch-pipe__bar">
        <label className="ch-pipe__filter">
          <span>Tag</span>
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">Everyone</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ch-pipe__check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          <span>Only people assigned to me</span>
        </label>
        <span className="ch-pipe__spacer" />
        <a className="ch-pipe__btn" href={exportHref}>
          Download list (CSV)
        </a>
        <a className="ch-pipe__btn ch-pipe__btn--primary" href={`${admin}/collections/people/create`}>
          + Add a person
        </a>
      </div>
      <p className="ch-pipe__status" role="status" aria-live="polite">
        {msg}
      </p>

      <div className="ch-pipe__board">
        {STAGES.map((s, si) => {
          const col = shown.filter((c) => c.stage === s.value)
          return (
            <section
              key={s.value}
              className={`ch-pipe__col${over === s.value ? ' is-over' : ''}`}
              aria-label={`${s.label}, ${col.length} ${col.length === 1 ? 'person' : 'people'}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(s.value)
              }}
              onDragLeave={() => setOver((o) => (o === s.value ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                if (dragId) move(dragId, s.value)
                setDragId(null)
              }}
            >
              <h2>
                {s.label}
                <b>{col.length}</b>
              </h2>
              {col.length === 0 && <p className="ch-pipe__empty">No one here yet</p>}
              {col.map((c) => {
                const prev = STAGES[si - 1]
                const next = STAGES[si + 1]
                return (
                  <article
                    key={c.id}
                    className={`ch-card${dragId === c.id ? ' is-dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <a className="ch-card__name" href={`${admin}/collections/people/${c.id}`}>
                      {c.name}
                    </a>
                    {c.tags.length > 0 && (
                      <div className="ch-card__tags">
                        {c.tags.map((t) => (
                          <span key={t.id}>{t.name}</span>
                        ))}
                      </div>
                    )}
                    <div className="ch-card__meta">
                      {c.nextDue ? (
                        <span className={isOverdue(c.nextDue) ? 'is-late' : ''}>
                          {isOverdue(c.nextDue) ? 'Overdue · ' : 'Follow up '}
                          {fmt(c.nextDue)}
                          {c.openCount > 1 ? ` +${c.openCount - 1}` : ''}
                        </span>
                      ) : (
                        <span className="is-quiet">No follow-up set</span>
                      )}
                      {c.assignee && (
                        <span className="ch-card__who" title={`Assigned to ${c.assignee.name}`}>
                          {initials(c.assignee.name)}
                        </span>
                      )}
                    </div>
                    <div className="ch-card__move">
                      <button type="button" disabled={!prev} onClick={() => prev && move(c.id, prev.value)} aria-label={prev ? `Move ${c.name} back to ${prev.label}` : undefined}>
                        ←
                      </button>
                      <button type="button" disabled={!next} onClick={() => next && move(c.id, next.value)} aria-label={next ? `Move ${c.name} to ${next.label}` : undefined}>
                        →
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
    </>
  )
}
