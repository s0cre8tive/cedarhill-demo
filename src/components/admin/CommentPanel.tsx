'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { refreshBell } from './BellClient'
import { ago, api, initials } from './teamUi'

type Comment = { id: string; body: string; createdAt: string; authorId: string; author: string; mentions: string[] }
type Thread = { me: string; canRemoveAny: boolean; people: Array<{ id: string; name: string }>; comments: Comment[] }

/**
 * "Team notes" on an event, a guest or a sermon. Type @ to tag a teammate:
 * they get a notification that links straight back to this page.
 */
export function CommentPanel() {
  const { id, collectionSlug } = useDocumentInfo()
  const [thread, setThread] = useState<Thread | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const box = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    if (!id || !collectionSlug) return
    try {
      setThread(await api<Thread>(`/api/comments/thread?on=${collectionSlug}&id=${id}`))
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [id, collectionSlug])

  useEffect(() => {
    load()
    if (!id || !collectionSlug) return
    // Opening the record clears its mentions from My notifications.
    api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ link: `/admin/collections/${collectionSlug}/${id}` }) })
      .then(refreshBell)
      .catch(() => null)
  }, [load, id, collectionSlug])

  if (!id) return <p className="ch-cm__tip">Save this first, then your team can leave notes here.</p>

  // While typing "@ma…", offer matching teammates.
  const typing = /(^|\s)@([\w'’-]*)$/.exec(body)
  const matches = typing && thread ? thread.people.filter((p) => p.name.toLowerCase().includes(typing[2].toLowerCase())).slice(0, 5) : []

  function pick(name: string) {
    setBody((b) => b.replace(/@([\w'’-]*)$/, `@${name} `))
    box.current?.focus()
  }

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ body: body.trim(), relatedTo: { relationTo: collectionSlug, value: Number(id) || id } }),
      })
      setBody('')
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  async function remove(c: Comment) {
    try {
      await api(`/api/comments/${c.id}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="ch-cm">
      <h3>Team notes{thread?.comments.length ? ` (${thread.comments.length})` : ''}</h3>
      <p className="ch-cm__sub">Only your team sees these. Type @ to tag someone.</p>
      {thread?.comments.map((c) => (
        <div key={c.id} className="ch-cm__item">
          <span className="ch-avatar" aria-hidden="true">
            {initials(c.author)}
          </span>
          <div>
            <p className="ch-post__who">
              <strong>{c.authorId === thread.me ? 'You' : c.author}</strong> <span>{ago(c.createdAt)}</span>
            </p>
            <p className="ch-post__body">{c.body}</p>
            {(c.authorId === thread.me || thread.canRemoveAny) && (
              <button type="button" className="ch-post__link" onClick={() => remove(c)}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      {thread && thread.comments.length === 0 && <p className="ch-cm__tip">No notes yet.</p>}
      <div className="ch-cm__new">
        <textarea
          ref={box}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Leave a note for the team…"
          aria-label="Leave a note for the team"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send()
          }}
        />
        {matches.length > 0 && (
          <div className="ch-cm__pick" role="listbox" aria-label="Tag a teammate">
            {matches.map((p) => (
              <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => pick(p.name)}>
                @{p.name}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="ch-team__btn ch-team__btn--go" disabled={busy || !body.trim()} onClick={send}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
        {err && <p className="ch-team__msg">{err}</p>}
      </div>
    </div>
  )
}
