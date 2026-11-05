import type { Payload } from 'payload'
import { loadPortrait } from './portraits'

/**
 * Cedar Hill Church — a fictional mid-size church used to demo EZEdit Mission.
 * Names match the EZEdit Mission case study (Pastors Jacob & Renee Walker, Marcus in Youth).
 */

/** Free photos from Unsplash (Unsplash License). Downloaded into Photos on first run. */
export const STOCK = {
  hero: {
    id: 'photo-1622598453695-4fbaf151aadc',
    alt: 'People raising their hands in worship in front of a lit stage',
    credit: 'Terren Hurst / Unsplash',
  },
  congregation: {
    id: 'photo-1760367120345-35a4bbadf3cf',
    alt: 'A congregation gathered together inside a large hall',
    credit: 'Christian Harb / Unsplash',
  },
  laughing: {
    id: 'photo-1491438590914-bc09fcaaf77a',
    alt: 'Friends laughing and talking together outside',
    credit: 'Priscilla Du Preez / Unsplash',
  },
  door: {
    id: 'photo-1609064982451-a423f691061b',
    alt: 'A red wooden front door with green plants above it',
    credit: 'Sara Cottle / Unsplash',
  },
  welcome: {
    id: 'photo-1614915760393-96de312e2bf5',
    alt: 'Someone stepping onto a welcome mat at the front door',
    credit: 'Jon Tyson / Unsplash',
  },
  band: {
    id: 'photo-1507692049790-de58290a4334',
    alt: 'A worship band leading music on stage',
    credit: 'Edward Cisneros / Unsplash',
  },
  kids: {
    id: 'photo-1553729784-e91953dec042',
    alt: 'A young girl reading a book',
    credit: 'Joel Muniz / Unsplash',
  },
  youth: {
    id: 'photo-1717278088457-b145be192237',
    alt: 'A group of young people standing together',
    credit: 'Elianna Gill / Unsplash',
  },
  groups: {
    id: 'photo-1576506542790-51244b486a6b',
    alt: 'Someone opening a book at a table',
    credit: 'Andrik Langfield / Unsplash',
  },
  prayer: {
    id: 'photo-1760367120345-2b96c53de838',
    alt: 'People gathered indoors with heads bowed in prayer',
    credit: 'Christian Harb / Unsplash',
  },
  outreach: {
    id: 'photo-1582213782179-e0d53f98f2ca',
    alt: 'Volunteers stacking their hands together',
    credit: 'Hannah Busing / Unsplash',
  },
  bible: {
    id: 'photo-1497621122273-f5cfb6065c56',
    alt: 'An open Bible',
    credit: 'Aaron Burden / Unsplash',
  },
} as const

export const LEAD_PASTORS = {
  name: 'Pastors Jacob & Renee Walker',
  title: 'Lead Pastors',
  bio: 'Jacob and Renee have led Cedar Hill together for twelve years. They love a full fellowship hall, a long walk after Sunday dinner, and a sermon that sends people out ready to serve their neighbors.',
}

export type StockKey = keyof typeof STOCK

export const stockUrl = (key: StockKey, w = 2000) =>
  `https://images.unsplash.com/${STOCK[key].id}?w=${w}&q=80&fm=jpg&fit=crop&auto=format`

/** Dates from the case study (Sat Nov 14, Sat Nov 21…). If one has passed, roll it forward by whole weeks. */
const upcoming = (iso: string) => {
  const d = new Date(`${iso}T12:00:00.000Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  while (d < today) d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}
const daysAgo = (n: number) => {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

type PhotoPlan = { key: StockKey; spot: string; caption?: string }

async function fetchStock(key: StockKey) {
  const res = await fetch(stockUrl(key), { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Gets the starter photos into Photos. Photos already there (from an earlier load) are reused,
 * so a reset is quick. Missing ones are downloaded all at once, then saved in order.
 */
async function loadPhotos(payload: Payload, plan: PhotoPlan[]) {
  const ids: Array<string | number | null> = []
  const missing: number[] = []
  for (const [i, p] of plan.entries()) {
    const found = await payload.find({
      collection: 'media',
      where: { and: [{ filename: { contains: `cedarhill-${p.key}` } }, { spot: { equals: p.spot } }] },
      limit: 1,
      depth: 0,
    })
    const doc = found.docs[0]
    if (doc) {
      await payload.update({
        collection: 'media',
        id: doc.id,
        context: { skipLog: true },
        data: { alt: STOCK[p.key].alt, caption: p.caption ?? null, credit: STOCK[p.key].credit } as never,
      })
      ids[i] = doc.id
    } else {
      ids[i] = null
      missing.push(i)
    }
  }
  if (!missing.length) return ids

  const files = await Promise.allSettled(missing.map((i) => fetchStock(plan[i].key)))
  for (const [n, i] of missing.entries()) {
    const p = plan[i]
    const f = files[n]
    if (f.status !== 'fulfilled') {
      payload.logger.warn(`Photo "${p.key}" could not be downloaded (${(f.reason as Error)?.message}). The site will load it from Unsplash instead.`)
      continue
    }
    try {
      const doc = await payload.create({
        collection: 'media',
        context: { skipLog: true },
        data: { alt: STOCK[p.key].alt, spot: p.spot, caption: p.caption, credit: STOCK[p.key].credit } as never,
        file: { data: f.value, mimetype: 'image/jpeg', name: `cedarhill-${p.key}.jpg`, size: f.value.length },
      })
      ids[i] = doc.id
    } catch (err) {
      payload.logger.warn(`Photo "${p.key}" could not be saved (${(err as Error).message}).`)
    }
  }
  return ids
}

export const STARTER_INFO = {
  services: [
    { name: 'Sunday Worship', day: 'Sunday', time: '10:30 AM', note: 'Kids check-in opens at 10:10' },
    { name: 'Wednesday Night Groups', day: 'Wednesday', time: '7:00 PM', note: 'Dinner at 6:15 · all ages' },
    { name: 'Neighbors Pantry', day: 'Saturday', time: '9–11 AM', note: 'Free groceries · no sign-up needed' },
  ],
  street: '2140 Cedar Hill Road',
  cityLine: 'Maple Grove, MD 20999',
  phone: '(301) 555-0142',
  email: 'hello@cedarhill.example',
  givingLink: 'https://example.com/give',
  liveLink: '',
}

export const STARTER_ANNOUNCEMENT = {
  show: true,
  message: 'Fall Festival is Saturday, Nov 14 · free food, games and a bounce house for the kids.',
  linkText: 'Details',
  linkUrl: '/#happening',
}

const isEmpty = async (payload: Payload, collection: 'events' | 'ministries' | 'leaders' | 'sermons') =>
  (await payload.count({ collection })).totalDocs === 0

/**
 * Fills in Cedar Hill's demo content. Each part is only added when it's missing, so this
 * is safe to run again and finishes the job if an earlier run was interrupted.
 * `reset: true` also puts service times and the banner back.
 */
export async function loadStarterContent(payload: Payload, opts: { reset?: boolean } = {}) {
  const ctx = { skipLog: true }
  const info = await payload.findGlobal({ slug: 'church-info' })
  const firstTime = !(info.services && info.services.length)
  const demo = process.env.DEMO_RESET !== 'off'
  // A real church site only ever gets starter content once. The demo also repairs itself.
  if (!firstTime && !opts.reset && !demo) return false

  const need = {
    ministries: await isEmpty(payload, 'ministries'),
    leaders: await isEmpty(payload, 'leaders'),
    events: await isEmpty(payload, 'events'),
    sermons: await isEmpty(payload, 'sermons'),
  }
  const anything = firstTime || opts.reset || Object.values(need).some(Boolean)
  if (!anything) return false

  payload.logger.info('Loading Cedar Hill demo content…')

  if (firstTime || opts.reset) {
    await payload.updateGlobal({ slug: 'church-info', context: ctx, data: STARTER_INFO as never })
    await payload.updateGlobal({ slug: 'announcement', context: ctx, data: STARTER_ANNOUNCEMENT })
  }

  // Photos. Header slideshow: newest shows first, so the main worship photo goes last.
  const plan: PhotoPlan[] = [
    { key: 'band', spot: 'hero' },
    { key: 'congregation', spot: 'hero' },
    { key: 'hero', spot: 'hero' },
    { key: 'congregation', spot: 'gallery', caption: 'Sunday mornings at Cedar Hill' },
    { key: 'laughing', spot: 'gallery', caption: 'Coffee after service' },
    { key: 'outreach', spot: 'library' },
    { key: 'welcome', spot: 'visit' },
    { key: 'bible', spot: 'sermon' },
    { key: 'band', spot: 'library' },
    { key: 'kids', spot: 'library' },
    { key: 'youth', spot: 'library' },
    { key: 'groups', spot: 'library' },
    { key: 'prayer', spot: 'library' },
    // newest gallery photo shows first, so the door photo goes last
    { key: 'door', spot: 'gallery', caption: 'Come on in — the door is open' },
  ]
  const got = await loadPhotos(payload, plan)
  const ph: Partial<Record<StockKey, string | number | null>> = {}
  plan.forEach((p, i) => {
    // ministries and events use the library / gallery copies
    if (p.spot !== 'hero') ph[p.key] = got[i]
  })

  const ministries: Array<{ key: StockKey; name: string; tagline: string; meets: string; about: string; leaderName: string }> = [
    { key: 'kids', name: 'Cedar Kids', tagline: 'Birth through 5th grade', meets: 'Sundays · during the 10:30 service', about: 'Safe, checked-in classrooms where kids learn the big story of God through games, music and small groups.', leaderName: 'Alicia Moreno' },
    { key: 'youth', name: 'Cedar Youth', tagline: 'Grades 6–12 · real talk, real faith', meets: 'Wednesdays · 7:00 PM', about: 'Games, worship and honest conversation for middle and high schoolers, plus retreats and service days.', leaderName: 'Marcus Reed' },
    { key: 'band', name: 'Worship & Arts', tagline: 'Musicians, singers, tech & creatives', meets: 'Thursdays · 7:00 PM rehearsal', about: 'Lead the church in worship from the stage or the sound booth. All experience levels welcome.', leaderName: 'Jordan Ellis' },
    { key: 'groups', name: 'Small Groups', tagline: 'Life is better in circles than rows', meets: 'Wednesdays · 7:00 PM and in homes', about: 'Eight to twelve people who eat, study Scripture, pray and do life together.', leaderName: 'Denise & Paul Carter' },
    { key: 'prayer', name: 'Prayer Team', tagline: 'Standing with you in prayer', meets: 'Sundays · 9:45 AM in the chapel', about: 'A team that prays over every request, before and after every service.', leaderName: 'Grace Whitfield' },
    { key: 'outreach', name: 'Neighbors Outreach', tagline: 'Pantry, tutoring & community care', meets: 'Saturdays · 9–11 AM', about: 'Our Saturday pantry, after-school tutoring and seasonal drives that serve Maple Grove.', leaderName: 'Tom Nguyen' },
  ]
  if (need.ministries)
    for (const [i, m] of ministries.entries()) {
      await payload.create({
        collection: 'ministries',
        context: ctx,
        data: { name: m.name, tagline: m.tagline, meets: m.meets, about: m.about, leaderName: m.leaderName, order: i + 1, photo: ph[m.key] ?? undefined } as never,
      })
    }
  const ministryIds: Record<string, string | number> = {}
  for (const m of (await payload.find({ collection: 'ministries', limit: 100, depth: 0 })).docs) ministryIds[m.name] = m.id

  const leaders = [
    { ...LEAD_PASTORS },
    { name: 'Rev. Daniel Okafor', title: 'Associate Pastor', bio: 'Daniel oversees small groups and care ministries. If you’re new, he’s probably the one handing you a coffee and asking your name.' },
    { name: 'Marcus Reed', title: 'Youth Pastor', bio: 'Marcus leads Cedar Youth on Wednesday nights and runs the best lock-in in Maple Grove.' },
  ]
  if (need.leaders) for (const [i, l] of leaders.entries()) {
    const photo = await loadPortrait(payload, l.name)
    await payload.create({ collection: 'leaders', context: ctx, data: { ...l, photo, order: i + 1 } as never })
  }

  const events = [
    { title: 'Fall Festival', date: upcoming('2026-11-14'), time: '12:00 – 4:00 PM', location: 'Fellowship Hall', details: 'Free food, games for the kids, a bounce house and a chili cook-off. Everyone is welcome — bring a neighbor.', flyer: ph.laughing, ministry: 'Neighbors Outreach' },
    { title: 'Men’s Breakfast', date: upcoming('2026-11-07'), time: '8:00 AM', location: 'Fellowship Hall', details: 'Pancakes, coffee and a short devotional. Guys of every age are invited.' },
    { title: 'Thanksgiving Food Drive', date: upcoming('2026-11-22'), time: 'All day', location: 'Front lobby', details: 'Drop off canned goods and boxed stuffing before or after service. Everything goes to the Neighbors Pantry.', ministry: 'Neighbors Outreach' },
    { title: 'Christmas Eve Candlelight Service', date: upcoming('2026-12-24'), time: '5:00 PM & 7:00 PM', location: 'Sanctuary', details: 'Carols, candles and the Christmas story. Childcare available at the 5:00 service.' },
  ]
  if (need.events) for (const e of events)
    await payload.create({
      collection: 'events',
      context: ctx,
      data: { ...e, flyer: e.flyer ?? undefined, ministry: e.ministry ? ministryIds[e.ministry] : undefined, approval: 'live', submittedBy: 'Church Office' } as never,
    })

  const sermons = [
    { title: 'Rooted: Planted by Streams of Water', scripture: 'Psalm 1:1–3', date: daysAgo(3), summary: 'Week four of our Rooted series. A tree doesn’t worry about the drought when its roots reach the river.' },
    { title: 'Rooted: Deep Roots, Wide Branches', scripture: 'Colossians 2:6–7', date: daysAgo(10) },
    { title: 'Rooted: The Cedar and the Storm', scripture: 'Psalm 92:12–15', date: daysAgo(17) },
  ]
  if (need.sermons) for (const s of sermons)
    await payload.create({ collection: 'sermons', context: ctx, data: { ...s, preacher: 'Pastor Renee Walker' } })

  await payload.create({
    collection: 'changes',
    context: ctx,
    data: { summary: 'Cedar Hill demo content loaded', area: 'Website', source: 'system', status: 'live', by: 'EZEdit Mission' },
  })

  payload.logger.info('✅ Cedar Hill demo content is ready.')
  return { ministryIds }
}
