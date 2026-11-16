'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ago, api, initials } from './teamUi'

export type Post = {
  id: string
  body: string
  author: string
  mine: boolean
  createdAt: string
  file: { url: string; name: string } | null
  replies: Post[]
}

type Props = { teamId: string; teamName: string; posts: Post[]; canRemoveAny: boolean; mentionable: string[] }

/** The message board inside a team space: new posts on top, replies underneath each one. */
export function TeamSpace({ teamId, teamName, posts, canRemoveAny, mentionable }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function send(text: string, parent?: string) {
    if (!text.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      let attachment: string | number | undefined
      if (!parent && file) {
        if (file.size > 4 * 1024 * 1024) throw new Error('That file is over 4 MB. Try a smaller photo or PDF.')
        const form = new FormData()
        form.append('file', file)
        form.append('_payload', JSON.stringify({}))
        const up = await api<{ doc: { id: string | number } }>('/api/team-files', { method: 'POST', body: form })
        attachment = up.doc.id
      }
      await api('/api/team-posts', {
        method: 'POST',
        body: JSON.stringify({ team: Number(teamId) || teamId, body: text.trim(), ...(parent ? { parent: Number(parent) || parent } : {}), ...(attachment ? { attachment } : {}) }),
      })
      if (parent) {
        setReply('')
        setReplyTo(null)
      } else {
        setBody('')
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
      }
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  async function remove(id: string) {
    setBusy(true)
    setErr('')
    try {
      await api(`/api/team-posts/${id}`, { method: 'DELETE' })
      setConfirm(null)
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  const Entry = ({ p, small }: { p: Post; small?: boolean }) => (
    <div className={`ch-post__row${small ? ' ch-post__row--reply' : ''}`}>
      <span className="ch-avatar" aria-hidden="true">
        {initials(p.author)}
      </span>
      <div className="ch-post__main">
        <p className="ch-post__who">
          <strong>{p.mine ? 'You' : p.author}</strong> <span>{ago(p.createdAt)}</span>
        </p>
        <p className="ch-post__body">{p.body}</p>
        {p.file && (
          <p className="ch-ann__links">
            <a href={p.file.url} target="_blank" rel="noopener noreferrer">
              {p.file.name} ↗
            </a>
          </p>
        )}
        {(p.mine || canRemoveAny) &&
          (confirm === p.id ? (
            <span className="ch-post__confirm">
              Remove this {small ? 'reply' : 'post'}?{' '}
              <button type="button" onClick={() => remove(p.id)} disabled={busy}>
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirm(null)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" className="ch-post__link" onClick={() => setConfirm(p.id)}>
              Remove
            </button>
          ))}
      </div>
    </div>
  )

  return (
    <section className="ch-space__main" aria-label={`${teamName} posts`}>
      <form
        className="ch-compose"
        onSubmit={(e) => {
          e.preventDefault()
          send(body)
        }}
      >
        <label htmlFor="ch-newpost">Post to your team</label>
        <textarea
          id="ch-newpost"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={`Share an update with ${teamName}…${mentionable[0] ? ` Type @${mentionable[0].split(' ')[0]} to tag someone.` : ''}`}
        />
        <div className="ch-compose__row">
          <label className="ch-compose__file">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span>{file ? file.name : 'Add a photo or PDF'}</span>
          </label>
          <button type="submit" className="ch-team__btn ch-team__btn--go" disabled={busy || !body.trim()}>
            {busy && !replyTo ? 'Posting…' : 'Post'}
          </button>
        </div>
        {err && <p className="ch-team__msg">{err}</p>}
      </form>

      {posts.length === 0 && <p className="ch-team__empty">No posts yet. Be the first to share an update with {teamName}.</p>}

      {posts.map((p) => (
        <article key={p.id} id={`post-${p.id}`} className="ch-post">
          <Entry p={p} />
          {p.replies.length > 0 && (
            <div className="ch-post__replies">
              {p.replies.map((r) => (
                <Entry key={r.id} p={r} small />
              ))}
            </div>
          )}
          {replyTo === p.id ? (
            <form
              className="ch-compose ch-compose--reply"
              onSubmit={(e) => {
                e.preventDefault()
                send(reply, p.id)
              }}
            >
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={4000} placeholder="Write a reply…" autoFocus aria-label="Your reply" />
              <div className="ch-compose__row">
                <button type="button" className="ch-post__link" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
                <button type="submit" className="ch-team__btn ch-team__btn--go" disabled={busy || !reply.trim()}>
                  {busy ? 'Sending…' : 'Reply'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="ch-post__replybtn"
              onClick={() => {
                setReplyTo(p.id)
                setReply('')
              }}
            >
              Reply{p.replies.length ? ` (${p.replies.length})` : ''}
            </button>
          )}
        </article>
      ))}
    </section>
  )
}
