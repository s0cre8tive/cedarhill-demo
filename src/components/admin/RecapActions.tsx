'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

/** Preview and Send buttons at the top of a Sunday Recap. */
export function RecapActions() {
  const { id } = useDocumentInfo()
  const status = useFormFields(([f]) => f.status?.value as string | undefined)
  const sentNote = useFormFields(([f]) => f.sentNote?.value as string | undefined)
  const [state, setState] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  if (!id) return <p className="ch-rc-tip">Save the recap first, then you can preview and send it.</p>

  async function send() {
    setState('sending')
    try {
      const res = await fetch(`/api/recaps/${id}/send`, { method: 'POST', credentials: 'include' })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; note?: string; error?: string }
      if (!res.ok || body.ok === false) throw new Error(body.error || body.note || `Something went wrong (${res.status}).`)
      setMsg(body.note || 'Sent.')
      setState('done')
      setTimeout(() => window.location.reload(), 1800)
    } catch (err) {
      setMsg((err as Error).message)
      setState('error')
    }
  }

  return (
    <div className="ch-rc">
      <div className="ch-rc__text">
        <b>{status === 'sent' ? 'This recap has been sent.' : 'Ready when you are.'}</b>
        <span>
          {status === 'sent'
            ? sentNote || 'It’s on the website for anyone who missed the email.'
            : 'Save your changes, preview how it looks, then send it to everyone on the email list.'}
        </span>
        {state === 'done' && <span className="ch-rc__ok">{msg}</span>}
        {state === 'error' && <span className="ch-rc__err">{msg}</span>}
      </div>
      <div className="ch-rc__btns">
        <a className="ch-rc__btn" href={`/recap/${id}`} target="_blank" rel="noopener">
          Preview ↗
        </a>
        {status !== 'sent' &&
          (state === 'confirm' ? (
            <>
              <button type="button" className="ch-rc__btn ch-rc__btn--go" onClick={send}>
                Yes, send it now
              </button>
              <button type="button" className="ch-rc__btn" onClick={() => setState('idle')}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="ch-rc__btn ch-rc__btn--go" disabled={state === 'sending' || state === 'done'} onClick={() => setState('confirm')}>
              {state === 'sending' ? 'Sending…' : 'Send the recap'}
            </button>
          ))}
      </div>
    </div>
  )
}
