import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import React from 'react'
import { teamCommOn } from '../../lib/package'
import { NotificationList } from './NotificationList'

const CHOICE: Record<string, string> = {
  instant: 'You get an email right away for mentions and team announcements.',
  daily: 'You get one summary email each weekday morning.',
  off: 'Emails are off. Everything still shows here.',
}

/** /admin/notifications — "My notifications": mentions, replies and team announcements. */
export async function Notifications({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req
  const admin = payload.config.routes.admin
  if (!user) redirect(`${admin}/login?redirect=${encodeURIComponent(`${admin}/notifications`)}`)
  if (!teamCommOn()) redirect(admin)

  const notes = await payload.find({ collection: 'notifications', where: { recipient: { equals: user.id } }, sort: '-createdAt', limit: 60, depth: 0 })
  const choice = String((user as unknown as { notify?: string }).notify ?? 'instant')

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
      // Keeps the header bell (Cathedral) on this page too.
      viewActions={payload.config.admin?.components?.actions}
    >
      <div className="ch-pipe ch-teams">
        <div className="ch-pipe__head">
          <div>
            <p className="ch-kicker">Team</p>
            <h1>My notifications</h1>
            <p className="ch-welcome__sub">
              {CHOICE[choice] ?? CHOICE.instant} <a href={`${admin}/account`}>Change my email settings</a>
            </p>
          </div>
        </div>
        <NotificationList
          notes={notes.docs.map((n) => ({
            id: String(n.id),
            type: n.type,
            title: n.title,
            body: n.body ?? '',
            link: n.link || admin,
            createdAt: n.createdAt,
            unread: !n.readAt,
          }))}
        />
      </div>
    </DefaultTemplate>
  )
}
