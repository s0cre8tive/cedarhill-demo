import type { Access, CollectionConfig } from 'payload'
import { isAdmin, userOf } from '../access'
import { cathedral } from '../lib/team'

const mine: Access = ({ req }) => {
  const user = userOf(req)
  return user ? { recipient: { equals: user.id } } : false
}
const never = () => false

/** "My notifications": mentions, replies, team announcements and reminders for one person. */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Notification', plural: 'Notifications' },
  admin: { hideAPIURL: true, group: 'Team', useAsTitle: 'title', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: cathedral(mine),
    // Written by the system when someone is mentioned, replied to or sent an announcement.
    create: never,
    update: cathedral(mine),
    delete: cathedral(isAdmin),
  },
  endpoints: [
    {
      // POST /api/notifications/read  { all: true } | { link: "/admin/…" } | { id }
      path: '/read',
      method: 'post',
      handler: async (req) => {
        const user = userOf(req)
        if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 })
        const body = (await req.json?.().catch(() => ({}))) as { all?: boolean; link?: string; id?: string | number }
        const scope = body?.all ? [] : body?.id != null ? [{ id: { equals: body.id } }] : body?.link ? [{ link: { equals: body.link } }] : null
        if (!scope) return Response.json({ error: 'Nothing to mark.' }, { status: 400 })
        const res = await req.payload.update({
          collection: 'notifications',
          where: { and: [{ recipient: { equals: user.id } }, { readAt: { exists: false } }, ...scope] },
          data: { readAt: new Date().toISOString() } as never,
          overrideAccess: true,
          req,
        })
        return Response.json({ ok: true, marked: res.docs.length })
      },
    },
  ],
  fields: [
    { name: 'recipient', type: 'relationship', relationTo: 'users', index: true, access: { update: never } },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Mention', value: 'mention' },
        { label: 'Reply', value: 'reply' },
        { label: 'Team announcement', value: 'announcement' },
        { label: 'Reminder', value: 'reminder' },
      ],
      access: { update: never },
    },
    { name: 'title', type: 'text', required: true, access: { update: never } },
    { name: 'body', type: 'textarea', access: { update: never } },
    { name: 'from', type: 'text', access: { update: never } },
    { name: 'link', type: 'text', access: { update: never } },
    { name: 'readAt', type: 'date', index: true },
    { name: 'emailedAt', type: 'date', access: { update: never } },
  ],
}
