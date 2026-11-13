import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import React from 'react'
import { PrintButton } from './PrintButton'

/** /admin/connect-card: the QR code for the bulletin, the lobby sign and the screen. */
export async function ConnectCardQR({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req
  const admin = payload.config.routes.admin
  if (!user) redirect(`${admin}/login?redirect=${encodeURIComponent(`${admin}/connect-card`)}`)

  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || ''
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const site = (process.env.NEXT_PUBLIC_SERVER_URL || (host ? `${proto}://${host}` : '')).replace(/\/$/, '')
  const url = `${site}/connect`
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1C1633', light: '#FFFFFF' } })

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const [week, total] = await Promise.all([
    payload.count({ collection: 'inbox', where: { and: [{ formType: { equals: 'card' } }, { createdAt: { greater_than: weekAgo } }] } }),
    payload.count({ collection: 'inbox', where: { formType: { equals: 'card' } } }),
  ])

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div className="ch-pipe ch-qr">
        <div className="ch-pipe__head ch-noprint">
          <div>
            <p className="ch-kicker">Sundays · Digital connect card</p>
            <h1>Connect card QR code</h1>
            <p className="ch-welcome__sub">
              Put this on the screen during announcements, in the bulletin and on the lobby sign. Guests scan it, fill out a
              one-minute card, and land in People with a follow-up. They’re checked in for the day too.
            </p>
          </div>
        </div>

        <div className="ch-qr__stats ch-noprint">
          <a href={`${admin}/collections/inbox?where[formType][equals]=card`}>
            <b>{week.totalDocs}</b> cards this week
          </a>
          <a href={`${admin}/collections/inbox?where[formType][equals]=card`}>
            <b>{total.totalDocs}</b> all time
          </a>
          <PrintButton />
          <a className="ch-btn" href="/connect" target="_blank" rel="noopener">
            Open the card ↗
          </a>
        </div>

        <div className="ch-qr__sheet">
          <div className="ch-qr__copy">
            <img src="/cedarhill-logo.png" alt="" width={64} height={64} />
            <p className="ch-qr__kicker">New here? We’re glad you came.</p>
            <h2>Scan to connect</h2>
            <p>Point your phone’s camera at the code. It takes about a minute.</p>
            <p className="ch-qr__url">{url.replace(/^https?:\/\//, '')}</p>
          </div>
          <div className="ch-qr__code" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <p className="ch-hint ch-noprint">
          Want a text-to-connect number too (“Text HELLO to …”)? That needs a texting service such as Twilio; ask Kingdom Kit
          to switch it on.
        </p>
      </div>
    </DefaultTemplate>
  )
}
