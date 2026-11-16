import React from 'react'
import { teamCommOn } from '../../lib/package'

/** Login-screen logo */
export const Logo = () => (
  <div className="ch-logo">
    <img src="/cedarhill-logo.png" alt="" width={72} height={72} />
    <div>
      <strong>Cedar Hill</strong>
      <span>Website Dashboard</span>
    </div>
  </div>
)

/** Small icon in the top-left of the dashboard */
export const Icon = () => (
  <img src="/cedarhill-logo.png" alt="Cedar Hill" width={30} height={30} style={{ display: 'block' }} />
)

/** Pinned at the top of the side menu. Volunteers (Cathedral) only get the team links. */
export const PipelineLink = ({ user }: { user?: { role?: string } | null }) => {
  const volunteer = user?.role === 'volunteer'
  return (
    <div className="ch-navlinks">
      {!volunteer && (
        <a className="ch-navpipe" href="/admin/pipeline">
          <span aria-hidden="true">▦</span> Pipeline board
        </a>
      )}
      {teamCommOn() && (
        <>
          <a className={`ch-navpipe${volunteer ? '' : ' ch-navpipe--alt'}`} href="/admin/teams">
            <span aria-hidden="true">◎</span> Teams
          </a>
          <a className="ch-navpipe ch-navpipe--alt" href="/admin/notifications">
            <span aria-hidden="true">◔</span> My notifications
          </a>
        </>
      )}
      {!volunteer && (
        <>
          <a className="ch-navpipe ch-navpipe--alt" href="/admin/check-in">
            <span aria-hidden="true">✓</span> Sunday check-in
          </a>
          <a className="ch-navpipe ch-navpipe--alt" href="/admin/connect-card">
            <span aria-hidden="true">▣</span> Connect card QR
          </a>
        </>
      )}
    </div>
  )
}

/** Extra links at the bottom of the side menu */
export const ViewSiteLink = () => (
  <div className="ch-navfoot">
    <a className="ch-viewsite" href="/" target="_blank" rel="noopener">
      View the website ↗
    </a>
    <span className="ch-powered">
      Powered by <b>Kingdom Kit</b>
    </span>
  </div>
)

/** Shown under the login form. On the demo it lists the two shareable logins. */
export const LoginHelp = () => {
  if (process.env.DEMO_RESET === 'off')
    return <p className="ch-loginhelp">Forgot your password or need access? Ask the church office.</p>
  return (
    <div className="ch-demo-logins">
      <p className="ch-demo-logins__title">Trying the demo? Sign in as {teamCommOn() ? 'any' : 'either'} of these.</p>
      <div className="ch-demo-logins__grid">
        <div>
          <strong>Tasha · Church office</strong>
          <span>Edits the website and approves posts</span>
          <code>office@cedarhill.demo</code>
        </div>
        <div>
          <strong>Marcus · Youth leader</strong>
          <span>Posts youth events for approval</span>
          <code>youth@cedarhill.demo</code>
        </div>
        {teamCommOn() && (
          <div>
            <strong>Priya · Kids volunteer</strong>
            <span>Sees only her teams and announcements</span>
            <code>volunteer@cedarhill.demo</code>
          </div>
        )}
      </div>
      <p className="ch-demo-logins__pw">
        Password for {teamCommOn() ? 'all three' : 'both'}: <code>CedarHill2026</code>
      </p>
      <p className="ch-demo-logins__fine">The demo resets itself every night, so feel free to change anything.</p>
    </div>
  )
}
