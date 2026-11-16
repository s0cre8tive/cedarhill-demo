import crypto from 'crypto'
import type { Payload } from 'payload'
import { teamCommOn } from './package'
import { comingSunday } from './teamMail'

/**
 * Team Communication demo content for Cedar Hill (Cathedral):
 * six teams, three team announcements, a Youth thread about the winter retreat,
 * and notes on a guest and on Sunday's event. Everyone here is fictional.
 */

type Id = string | number
export const VOLUNTEER_LOGIN = { name: 'Priya Nair', email: 'volunteer@cedarhill.demo' }

/** Volunteers with logins. Only Priya's is shared on the demo; the rest get a random password. */
const VOLUNTEERS = [
  'Jordan Ellis',
  'Alicia Gomez',
  'Sam Whitfield',
  'Nia Coleman',
  'Caleb Ortiz',
  'Grace Kim',
  'Priya Nair',
  'Tom Becker',
  'Lena Park',
  'Dana Brooks',
  'Will Foster',
  'Joy Adams',
  'Ellen Hayes',
  'Ruth Daniels',
  'Omar Haddad',
  'Hank Morris',
] as const
type V = (typeof VOLUNTEERS)[number]
const emailOf = (name: string) => (name === VOLUNTEER_LOGIN.name ? VOLUNTEER_LOGIN.email : `${name.toLowerCase().replace(/\s+/g, '.')}@cedarhill.demo`)

const TEAMS: Array<{ name: string; description: string; leader: V | 'office' | 'youth'; members: Array<V | 'admins'> }> = [
  { name: 'Church Office', description: 'Keeps the week running: calendar, website and guest follow-up.', leader: 'office', members: ['admins'] },
  { name: 'Youth', description: 'Cedar Youth, ages 11–18. Wednesdays and retreats.', leader: 'youth', members: ['Nia Coleman', 'Caleb Ortiz', 'Dana Brooks'] },
  { name: 'Worship', description: 'Sunday music, sound and slides.', leader: 'Jordan Ellis', members: ['Alicia Gomez', 'Sam Whitfield', 'Nia Coleman', 'Caleb Ortiz'] },
  { name: 'Kids', description: 'Cedar Kids classrooms and check-in.', leader: 'Grace Kim', members: ['Priya Nair', 'Tom Becker', 'Lena Park', 'Dana Brooks', 'Will Foster', 'Joy Adams'] },
  { name: 'Guest Care', description: 'Welcome desk, connect cards and first-time guests.', leader: 'Ellen Hayes', members: ['Ruth Daniels', 'Omar Haddad'] },
  { name: 'Facilities', description: 'Building, setup and teardown.', leader: 'Hank Morris', members: ['Omar Haddad', 'Will Foster'] },
]

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

/** Removes everything in Team Communication. Volunteer logins are kept, like other accounts. */
export async function clearTeam(payload: Payload) {
  const ctx = { skipLog: true, skipNotify: true }
  for (const collection of ['read-receipts', 'notifications', 'comments', 'team-posts', 'team-announcements', 'teams', 'team-files', 'campuses'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, context: ctx })
  }
}

export async function loadStarterTeam(payload: Payload) {
  if (!teamCommOn()) return false
  const ctx = { skipLog: true, skipNotify: true, seeding: true }
  const find = async (email: string) => (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0]
  const tasha = await find('office@cedarhill.demo')
  const marcus = await find('youth@cedarhill.demo')
  // The team demo is built around Tasha and Marcus. Without them there is nothing to show.
  if (!tasha || !marcus) return false
  await clearTeam(payload)

  // Volunteer logins. Priya's is shared on the login screen, so it's reset to the demo password each time.
  const { DEMO_PASSWORD } = await import('./demo')
  const people: Record<string, Id> = {}
  for (const name of VOLUNTEERS) {
    const shared = name === VOLUNTEER_LOGIN.name
    const found = await find(emailOf(name))
    const doc = found
      ? await payload.update({
          collection: 'users',
          id: found.id,
          data: { name, role: 'volunteer', ...(shared ? { password: DEMO_PASSWORD, loginAttempts: 0, lockUntil: null, notify: 'instant' } : {}) } as never,
        })
      : await payload.create({
          collection: 'users',
          data: { name, email: emailOf(name), role: 'volunteer', password: shared ? DEMO_PASSWORD : `${crypto.randomBytes(18).toString('hex')}Aa1` } as never,
        })
    people[name] = doc.id
  }
  const admins = (await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 20, depth: 0 })).docs.map((u) => u.id)
  const who = (k: string): Id[] => (k === 'admins' ? admins : k === 'office' ? [tasha.id] : k === 'youth' ? [marcus.id] : [people[k]])

  const campus = await payload.create({ collection: 'campuses', data: { name: 'Maple Grove' }, context: ctx })

  const teams: Record<string, Id> = {}
  for (const t of TEAMS) {
    const doc = await payload.create({
      collection: 'teams',
      context: ctx,
      data: { name: t.name, description: t.description, leader: who(t.leader)[0], members: t.members.flatMap(who), campus: campus.id } as never,
    })
    teams[t.name] = doc.id
  }

  // --- Three team announcements, all from Tasha in the church office ---
  const eve = new Date()
  eve.setUTCMonth(11, 24)
  eve.setUTCHours(12, 0, 0, 0)
  if (eve.getTime() < Date.now()) eve.setUTCFullYear(eve.getUTCFullYear() + 1)
  const announce = (data: Record<string, unknown>, hrs: number) =>
    payload.create({ collection: 'team-announcements', context: ctx, data: { author: tasha.id, createdAt: hoursAgo(hrs), ...data } as never })
  const pinned = await announce(
    {
      title: 'Christmas Eve service times are final',
      body: 'Candlelight services are at 4:00 PM and 6:00 PM on December 24. Every team serves at one of them. Please check your team space for your call time.',
      audience: 'all',
      pinnedUntil: eve.toISOString(),
    },
    20,
  )
  const readByAll = await announce(
    {
      title: 'New connect cards are at the welcome desk',
      body: 'The reprinted cards with the QR code came in. Please use these starting Sunday and recycle the old stack.',
      audience: 'teams',
      teams: [teams['Guest Care']],
    },
    72,
  )
  const halfRead = await announce(
    {
      title: 'Christmas rehearsal: Saturday the 19th, 10:00 AM',
      body: 'Worship and Kids rehearse together in the sanctuary for the Christmas Eve opener. Kids volunteers, please arrive by 9:45 to check families in.',
      audience: 'teams',
      teams: [teams['Worship'], teams['Kids']],
    },
    44,
  )
  const receipt = (announcement: Id, name: V, hrs: number) =>
    payload.create({ collection: 'read-receipts', context: ctx, data: { announcement, user: people[name], readAt: hoursAgo(hrs) } as never })
  for (const [i, n] of (['Jordan Ellis', 'Grace Kim', 'Ellen Hayes', 'Hank Morris', 'Alicia Gomez', 'Tom Becker', 'Ruth Daniels', 'Nia Coleman', 'Omar Haddad'] as V[]).entries())
    await receipt(pinned.id, n, 18 - i)
  // Everyone on Guest Care has read theirs: emerald "Read by all".
  for (const n of ['Ellen Hayes', 'Ruth Daniels', 'Omar Haddad'] as V[]) await receipt(readByAll.id, n, 60)
  // 5 of the 12 on Worship and Kids have read the rehearsal note.
  for (const n of ['Jordan Ellis', 'Alicia Gomez', 'Grace Kim', 'Tom Becker', 'Sam Whitfield'] as V[]) await receipt(halfRead.id, n, 30)

  // --- Youth: a thread about the winter retreat ---
  const post = (team: Id, author: Id, body: string, hrs: number, parent?: Id) =>
    payload.create({ collection: 'team-posts', context: ctx, data: { team, author, body, parent, createdAt: hoursAgo(hrs) } as never })
  const retreat = await post(
    teams['Youth'],
    marcus.id,
    'Winter retreat is January 16–18 at Pine Ridge. We have 22 students signed up and I need three more adults for cabins. Who can come for the whole weekend?',
    50,
  )
  await post(teams['Youth'], people['Nia Coleman'], 'I’m in for the whole weekend. I can drive the church van if someone else takes the trailer.', 47, retreat.id)
  await post(teams['Youth'], people['Caleb Ortiz'], 'I can come Friday night and Saturday, but I need to be back for worship rehearsal Sunday morning.', 41, retreat.id)
  await post(teams['Youth'], marcus.id, 'Perfect, thank you both. Dana, can you cover Sunday morning so Caleb can head back early?', 26, retreat.id)
  await post(teams['Youth'], marcus.id, 'Permission slips for the Lock-In are in the youth room. Please send families to me if they have questions.', 96)
  await post(teams['Kids'], people['Grace Kim'], 'We’re short two helpers in the 3s and 4s room this Sunday. Reply here if you can jump in for the 10:30 service.', 28)
  await post(teams['Church Office'], tasha.id, 'Bulletin deadline is Wednesday at noon this week because of the holiday print schedule.', 30)

  // --- Notes on records ---
  // A new guest family: Tasha tags Marcus so the teens hear from Youth.
  const guest = (await payload.find({ collection: 'people', where: { fullName: { equals: 'Tonya Brooks' } }, limit: 1, depth: 0 })).docs[0]
  const comment = (relationTo: string, value: Id, author: Id, body: string, hrs: number) =>
    payload.create({ collection: 'comments', context: ctx, data: { relatedTo: { relationTo, value }, author, body, createdAt: hoursAgo(hrs) } as never })
  if (guest) await comment('people', guest.id, tasha.id, '@Marcus this family has two teens, can you reach out? Mom said Wednesday nights work for them.', 5)

  // This Sunday's event, with a note from the office and a reply from Marcus.
  const sunday = `${comingSunday()}T12:00:00.000Z`
  const huddle = await payload.create({
    collection: 'events',
    context: ctx,
    data: {
      title: 'Volunteer Huddle & Lunch',
      date: sunday,
      time: '12:15 PM',
      location: 'Fellowship Hall',
      details: 'Every serving team, one room, one lunch. We’ll walk through Christmas Eve together.',
      approval: 'live',
      submittedBy: 'Church Office',
    } as never,
  })
  await comment('events', huddle.id, tasha.id, 'Lunch order goes in Thursday. Team leaders, I need your headcount by Wednesday night.', 9)
  await comment('events', huddle.id, marcus.id, 'Count Youth for 14. We’ll handle setup and teardown.', 3)

  // --- My notifications ---
  // Marcus signs in to 2 unread: the pinned announcement and the mention on the guest.
  const note = (recipient: Id, type: string, title: string, body: string, link: string, from: string, hrs: number, read = false) =>
    payload.create({
      collection: 'notifications',
      context: ctx,
      data: { recipient, type, title, body, link, from, createdAt: hoursAgo(hrs), readAt: read ? hoursAgo(Math.max(hrs - 1, 0)) : null, emailedAt: hoursAgo(hrs) } as never,
    })
  const board = (id: Id) => `/admin?a=${id}#team-board`
  await note(marcus.id, 'reply', 'Nia Coleman replied in Youth', 'I’m in for the whole weekend. I can drive the church van if someone else takes the trailer.', `/admin/teams/${teams['Youth']}#post-${retreat.id}`, 'Nia Coleman', 47, true)
  await note(marcus.id, 'announcement', `Team announcement: ${pinned.title}`, String(pinned.body), board(pinned.id), tasha.name, 20)
  if (guest)
    await note(marcus.id, 'mention', 'Tasha Bennett mentioned you on Tonya Brooks', '@Marcus this family has two teens, can you reach out? Mom said Wednesday nights work for them.', `/admin/collections/people/${guest.id}`, tasha.name, 5)
  // Tasha: Marcus answered her note on Sunday's event.
  await note(tasha.id, 'reply', 'Marcus Reed replied on Volunteer Huddle & Lunch', 'Count Youth for 14. We’ll handle setup and teardown.', `/admin/collections/events/${huddle.id}`, marcus.name, 3)
  // Priya (Kids volunteer): two announcements she hasn't read yet.
  await note(people['Priya Nair'], 'announcement', `Team announcement: ${halfRead.title}`, String(halfRead.body), board(halfRead.id), tasha.name, 44)
  await note(people['Priya Nair'], 'announcement', `Team announcement: ${pinned.title}`, String(pinned.body), board(pinned.id), tasha.name, 20)

  payload.logger.info('✅ Team Communication demo content is ready.')
  return true
}
