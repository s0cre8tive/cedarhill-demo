import type { Payload } from 'payload'
import { draftRecap, thisMonday } from './recap'

/**
 * Cedar Hill's Sunday tools for the demo: sermon videos and clips, serve shifts with a few
 * volunteers, six weeks of check-ins (two regulars have gone missing, so care alerts show),
 * one connect card, last week's Sunday Recap and this week's draft.
 */

// Stand-in videos from BibleProject (free to share), matched to the Rooted series.
export const SERMON_MEDIA: Record<string, { series: string; video: string; clips: Array<{ title: string; at: string }> }> = {
  'Rooted: Planted by Streams of Water': {
    series: 'Rooted',
    video: 'https://www.youtube.com/watch?v=E7k01kfBx6Y',
    clips: [
      { title: 'Two paths, one choice', at: '0:40' },
      { title: 'A tree by the river', at: '2:05' },
      { title: 'Delight changes everything', at: '3:20' },
    ],
  },
  'Rooted: Deep Roots, Wide Branches': {
    series: 'Rooted',
    video: 'https://www.youtube.com/watch?v=TJLan-pJzfQ',
    clips: [
      { title: 'Where the story begins', at: '0:30' },
      { title: 'Choosing life', at: '2:45' },
    ],
  },
  'Rooted: The Cedar and the Storm': {
    series: 'Rooted',
    video: 'https://www.youtube.com/watch?v=q9yp1ZXbsEg',
    clips: [{ title: 'Why the Psalms sing', at: '1:10' }],
  },
  'Open Doors: Blessed Are the Poor in Spirit': {
    series: 'Open Doors',
    video: 'https://www.youtube.com/watch?v=NtKb7CJDUZc',
    clips: [{ title: 'Upside-down blessing', at: '1:30' }],
  },
  'Open Doors: The God Who Comes Near': {
    series: 'Open Doors',
    video: 'https://www.youtube.com/watch?v=nxwzq1PJImM',
    clips: [{ title: 'Compassionate and gracious', at: '1:00' }],
  },
}

/** Noon UTC on the Sunday `n` weeks before the most recent one (Eastern time). */
export function sundaysAgo(n: number) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay() - n * 7)
  return d
}
const iso = (d: Date) => d.toISOString()

// Weeks ago each person was at church (0 = last Sunday). Ellen and Andre usually come but have
// been missing, so they show up as care alerts.
const ATTENDANCE: Record<string, number[]> = {
  'Sarah Lin': [0],
  'Tonya Brooks': [0],
  'Alicia Gomez': [0, 2],
  'Kevin Price': [0, 1],
  'Jada Thompson': [0, 1],
  'Michael Osei': [0, 1, 2, 3, 4, 5],
  'Ellen Hayes': [5, 6, 7, 8],
  'Grace Kim': [0, 1, 2, 3, 4, 5],
  'Andre Wallace': [4, 5, 6, 7],
  'Devin Carter': [1],
}

const SHIFTS: Array<{ team: string; time: string; spots: number; notes?: string }> = [
  { team: 'greeters', time: '10:00 – 10:45 AM', spots: 4, notes: 'Meet at the front doors' },
  { team: 'coffee', time: '9:30 – 11:00 AM', spots: 3 },
  { team: 'kids', time: '10:15 AM – 12:00 PM', spots: 4, notes: 'Background check required' },
  { team: 'tech', time: '9:00 AM – 12:00 PM', spots: 2, notes: 'Slides, sound or live stream' },
  { team: 'parking', time: '10:00 – 10:40 AM', spots: 3, notes: 'Vests are in the lobby closet' },
]

// Who already signed up for the next Sunday (by shift order), plus event sign-ups.
const SERVING: Array<[number, string]> = [
  [0, 'Ellen Hayes'],
  [0, 'Michael Osei'],
  [2, 'Grace Kim'],
  [2, 'Tonya Brooks'],
  [3, 'Alicia Gomez'],
  [4, 'Andre Wallace'],
]

export async function loadStarterSundays(payload: Payload) {
  const ctx = { skipLog: true, noCrm: true }

  // Sermons: series, video and clips. Two older messages fill out the library.
  const older = [
    { title: 'Open Doors: Blessed Are the Poor in Spirit', scripture: 'Matthew 5:1–12', date: iso(sundaysAgo(5)), summary: 'The first word of the Sermon on the Mount is a welcome for people who feel they have nothing to bring.' },
    { title: 'Open Doors: The God Who Comes Near', scripture: 'Exodus 34:6–7', date: iso(sundaysAgo(6)), summary: 'Compassionate, gracious, slow to anger: how God describes himself, and why it changes how we open our doors.' },
  ]
  for (const s of older) {
    const found = await payload.count({ collection: 'sermons', where: { title: { equals: s.title } } })
    if (!found.totalDocs) await payload.create({ collection: 'sermons', context: ctx, data: { ...s, preacher: 'Pastor Renee Walker' } as never })
  }
  const sermons = await payload.find({ collection: 'sermons', limit: 50, depth: 0, sort: '-date' })
  for (const s of sermons.docs) {
    const m = SERMON_MEDIA[s.title]
    if (m && !s.video) await payload.update({ collection: 'sermons', id: s.id, context: ctx, data: m as never })
  }

  // People by name.
  const people = await payload.find({ collection: 'people', limit: 500, depth: 0 })
  const who = (name: string) => people.docs.find((p) => p.fullName === name)

  // Check-ins for the last nine Sundays.
  for (const [name, weeks] of Object.entries(ATTENDANCE)) {
    const p = who(name)
    if (!p) continue
    for (const w of weeks) {
      const how = name === 'Tonya Brooks' ? 'card' : 'staff'
      await payload.create({ collection: 'attendance', context: ctx, data: { person: p.id, date: iso(sundaysAgo(w)), how } as never })
    }
  }

  // Tonya filled out a connect card last Sunday.
  const tonya = who('Tonya Brooks')
  if (tonya)
    await payload.create({
      collection: 'inbox',
      context: ctx,
      data: {
        formType: 'card',
        status: 'new',
        name: 'Tonya Brooks',
        email: tonya.email,
        phone: tonya.phone,
        summary: 'This is my: First visit\nI’d like to: Join a small group, Serve on a team\nHow we can pray: For my kids as they settle into a new school.',
        visibility: 'team',
        person: tonya.id,
        meta: { visit: 'first', wants: ['group', 'serve'] },
      } as never,
    })

  // Serve shifts: the next four Sundays, plus the Saturday pantry.
  const slotIds: Array<string | number> = []
  for (let week = 0; week < 4; week++) {
    const sun = sundaysAgo(-1 - week)
    for (const s of SHIFTS) {
      const doc = await payload.create({ collection: 'serve-slots', context: ctx, data: { ...s, date: iso(sun) } as never })
      if (week === 0) slotIds.push(doc.id)
    }
    const sat = new Date(sun)
    sat.setUTCDate(sat.getUTCDate() - 1)
    if (sat > new Date())
      await payload.create({
        collection: 'serve-slots',
        context: ctx,
        data: { team: 'pantry', time: '8:30 – 11:30 AM', spots: 6, notes: 'Wear closed-toe shoes', date: iso(sat) } as never,
      })
  }
  for (const [i, name] of SERVING) {
    const p = who(name)
    const slot = slotIds[i]
    if (!p || slot == null) continue
    const s = await payload.findByID({ collection: 'serve-slots', id: slot, depth: 0 })
    await payload.create({
      collection: 'signups',
      context: ctx,
      data: { name, email: p.email, phone: p.phone, what: s.label, slot, guests: 1, date: s.date, person: p.id } as never,
    })
  }

  // Events people can sign up for, with a few sign-ups already.
  const events = await payload.find({ collection: 'events', where: { title: { in: ['Fall Festival', 'Men’s Breakfast'] } }, limit: 5, depth: 0 })
  for (const e of events.docs) {
    const capacity = e.title === 'Fall Festival' ? 150 : 30
    await payload.update({ collection: 'events', id: e.id, context: ctx, data: { signUp: true, capacity } as never })
    const names = e.title === 'Fall Festival' ? [['Sarah Lin', 2], ['Kevin Price', 4], ['Grace Kim', 5]] : [['Michael Osei', 1], ['Andre Wallace', 2]]
    for (const [name, guests] of names as Array<[string, number]>) {
      const p = who(name)
      if (!p) continue
      await payload.create({
        collection: 'signups',
        context: ctx,
        data: { name, email: p.email, phone: p.phone, what: `${e.title}`, event: e.id, guests, date: e.date, person: p.id } as never,
      })
    }
  }

  // Last week's recap (sent) and this week's draft.
  const lastSermon = sermons.docs[1] ?? sermons.docs[0]
  const prevMonday = thisMonday()
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7)
  if (lastSermon)
    await payload.create({
      collection: 'recaps',
      context: ctx,
      data: {
        subject: `Sunday Recap: ${lastSermon.title.replace(/^.*?:\s*/, '')}`,
        pastorNote: 'What a Sunday! Thank you to everyone who served, sang, prayed and brought a friend. Here’s your week at Cedar Hill.\n\nPastors Jacob & Renee',
        sermon: lastSermon.id,
        weekOf: prevMonday.toISOString(),
        events: events.docs.map((e) => e.id),
        announcement: '',
        showServe: true,
        status: 'sent',
        sentAt: new Date(prevMonday.getTime() + 2 * 3600e3).toISOString(),
        sentNote: 'Demo: sent to the Email list',
      } as never,
    })
  await draftRecap(payload)
}
