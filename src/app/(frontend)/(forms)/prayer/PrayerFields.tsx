'use client'

import React, { useState } from 'react'

/** The "About you" part of the prayer form — hides contact fields when anonymous. */
export function PrayerAbout() {
  const [anon, setAnon] = useState(false)
  return (
    <>
      <label className="anon">
        <div>
          <b>Keep my request anonymous</b>
          <span>We’ll pray without your name attached.</span>
        </div>
        <span className="sw">
          <input type="checkbox" name="anonymous" onChange={(e) => setAnon(e.target.checked)} aria-label="Keep my request anonymous" />
          <i />
        </span>
      </label>
      {!anon && (
        <>
          <div className="row2">
            <label className="field">
              <span className="lab">
                Name<small>optional</small>
              </span>
              <input className="inp" type="text" name="name" autoComplete="name" />
            </label>
            <label className="field">
              <span className="lab">
                Email or phone<small>optional</small>
              </span>
              <input className="inp" type="text" name="contact" autoComplete="email" />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="callback" />
            <span>I’d like someone from the prayer team to reach out to me.</span>
          </label>
        </>
      )}
    </>
  )
}
