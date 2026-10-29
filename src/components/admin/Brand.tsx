import React from 'react'

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

/** Extra links at the bottom of the side menu */
export const ViewSiteLink = () => (
  <div className="ch-navfoot">
    <a className="ch-viewsite" href="/" target="_blank" rel="noopener">
      View the website ↗
    </a>
    <span className="ch-powered">
      Powered by <b>EZEdit Mission</b>
    </span>
  </div>
)

/** Shown under the login form */
export const LoginHelp = () => (
  <p className="ch-loginhelp">Forgot your password or need access? Ask the church office.</p>
)
