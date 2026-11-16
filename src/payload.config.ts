import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Events } from './collections/Events'
import { Sermons } from './collections/Sermons'
import { Leaders } from './collections/Leaders'
import { Inbox } from './collections/Inbox'
import { Ministries } from './collections/Ministries'
import { Changes } from './collections/Changes'
import { People } from './collections/People'
import { FollowUps } from './collections/FollowUps'
import { Tags } from './collections/Tags'
import { Attendance } from './collections/Attendance'
import { ServeSlots } from './collections/ServeSlots'
import { Signups } from './collections/Signups'
import { Recaps } from './collections/Recaps'
import { Campuses } from './collections/Campuses'
import { Teams } from './collections/Teams'
import { TeamAnnouncements } from './collections/TeamAnnouncements'
import { TeamPosts } from './collections/TeamPosts'
import { Comments } from './collections/Comments'
import { Notifications } from './collections/Notifications'
import { ReadReceipts } from './collections/ReadReceipts'
import { TeamFiles } from './collections/TeamFiles'
import { resendAdapter } from '@payloadcms/email-resend'
import { ChurchInfo } from './globals/ChurchInfo'
import { Announcement } from './globals/Announcement'
import { firstRun } from './lib/firstRun'
import { resetDemo } from './lib/demo'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || ''
const dbUrl = process.env.DATABASE_URL || ''
// Online: Postgres (e.g. Neon). On your computer: a simple SQLite file.
const usePostgres = /^postgres(ql)?:\/\//.test(dbUrl)

export default buildConfig({
  serverURL,
  // Only the site itself may talk to the API from a browser.
  cors: serverURL ? [serverURL] : [],
  csrf: serverURL ? [serverURL] : [],
  graphQL: { disable: true },
  admin: {
    user: Users.slug,
    theme: 'light',
    avatar: 'default',
    meta: {
      titleSuffix: ' · Cedar Hill Dashboard',
      icons: [{ rel: 'icon', type: 'image/png', url: '/favicon.png' }],
      robots: 'noindex, nofollow',
    },
    components: {
      graphics: {
        Logo: '@/components/admin/Brand#Logo',
        Icon: '@/components/admin/Brand#Icon',
      },
      beforeDashboard: ['@/components/admin/Welcome#Welcome'],
      // Cathedral: the bell with the unread count, on every page.
      actions: ['@/components/admin/Bell#Bell'],
      beforeNavLinks: ['@/components/admin/Brand#PipelineLink'],
      afterNavLinks: ['@/components/admin/Brand#ViewSiteLink'],
      views: {
        pipeline: { Component: '@/components/admin/Pipeline#Pipeline', path: '/pipeline' },
        checkin: { Component: '@/components/admin/CheckIn#CheckIn', path: '/check-in' },
        connectCard: { Component: '@/components/admin/ConnectCardQR#ConnectCardQR', path: '/connect-card' },
        // Cathedral: team spaces (/admin/teams and /admin/teams/:id) and My notifications.
        teams: { Component: '@/components/admin/Teams#Teams', path: '/teams' },
        notifications: { Component: '@/components/admin/Notifications#Notifications', path: '/notifications' },
      },
      afterLogin: ['@/components/admin/Brand#LoginHelp'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Nav order = the order staff see in the side menu.
  globals: [Announcement, ChurchInfo],
  collections: [Events, Ministries, Sermons, Media, Leaders, People, FollowUps, Tags, Inbox, Attendance, ServeSlots, Signups, Recaps, TeamAnnouncements, Teams, Campuses, TeamPosts, Comments, Notifications, ReadReceipts, TeamFiles, Changes, Users],
  // Reminders, confirmations and the Sunday Recap. Turns on when RESEND_API_KEY and EMAIL_FROM are set.
  email:
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM
      ? resendAdapter({
          apiKey: process.env.RESEND_API_KEY,
          defaultFromAddress: process.env.EMAIL_FROM,
          defaultFromName: process.env.EMAIL_FROM_NAME || 'Cedar Hill Church',
        })
      : undefined,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: usePostgres
    ? postgresAdapter({
        pool: { connectionString: dbUrl },
        migrationDir: path.resolve(dirname, 'migrations'),
        // Sets up / updates the database tables automatically when the live site starts.
        prodMigrations: migrations,
      })
    : sqliteAdapter({ client: { url: dbUrl } }),
  sharp,
  onInit: firstRun,
  endpoints: [
    {
      // POST /api/reset-demo — Pastor / Admin only. Turn off with DEMO_RESET=off.
      path: '/reset-demo',
      method: 'post',
      handler: async (req) => {
        const u = req.user as unknown as { role?: string; name?: string; email?: string } | null
        if (process.env.DEMO_RESET === 'off') return Response.json({ error: 'Reset is turned off on this site.' }, { status: 403 })
        if (!u || u.role !== 'admin') return Response.json({ error: 'Only a Pastor / Admin can reset the demo.' }, { status: 403 })
        try {
          await resetDemo(req.payload, u.name || u.email || 'Admin')
          return Response.json({ ok: true })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'Demo reset failed' })
          return Response.json({ error: `The reset didn’t finish: ${(err as Error).message}` }, { status: 500 })
        }
      },
    },
  ],
  plugins: [
    // Online photo storage. Turns on automatically when Vercel Blob is connected.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true, 'team-files': true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true, // lets staff upload big phone photos
    }),
  ],
})
