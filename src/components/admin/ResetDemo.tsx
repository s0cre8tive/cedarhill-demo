'use client'

import React, { useState } from 'react'

/** Pastor / Admin only: puts the Cedar Hill demo back to its starter content. */
export function ResetDemo() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'working' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function run() {
    setStep('working')
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST', credentials: 'include' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error || 'The reset didn’t finish. Try again in a minute.')
      setStep('done')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setMsg((err as Error).message)
      setStep('error')
    }
  }

  return (
    <div className="ch-reset" aria-live="polite">
      <div>
        <h2>Reset the demo</h2>
        <p>
          Puts the website back to the Cedar Hill starter content: events, ministries, sermons, pastors, photos and service
          times. It also clears the inbox and recent changes and resets the Tasha and Marcus logins to the demo password.
          Accounts you added are kept.
        </p>
        {step === 'working' && <p className="ch-reset__note">Resetting… this takes about a minute. Keep this page open.</p>}
        {step === 'done' && <p className="ch-reset__note ch-reset__note--ok">Done. Reloading the dashboard…</p>}
        {step === 'error' && <p className="ch-reset__note ch-reset__note--err">{msg}</p>}
      </div>
      <div className="ch-reset__actions">
        {step === 'confirm' ? (
          <>
            <button type="button" className="ch-reset__btn ch-reset__btn--danger" onClick={run}>
              Yes, reset everything
            </button>
            <button type="button" className="ch-reset__btn" onClick={() => setStep('idle')}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ch-reset__btn"
            disabled={step === 'working' || step === 'done'}
            onClick={() => setStep('confirm')}
          >
            {step === 'working' ? 'Resetting…' : 'Reset demo'}
          </button>
        )}
      </div>
    </div>
  )
}
