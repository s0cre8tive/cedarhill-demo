import { getPayload } from 'payload'
import config from '@payload-config'
import type { Media } from '@/payload-types'
import { STOCK, stockUrl, type StockKey } from './starter'
import { PORTRAITS } from './portraits'
import { LEAD_PASTORS } from './starter'

export type Photo = { url: string; alt: string; caption?: string | null }
export type Service = { name: string; day?: string | null; time: string; note?: string | null }

export type SiteInfo = {
  services: Service[]
  street: string
  cityLine: string
  phone: string
  phoneHref: string
  email: string
  givingLink: string
  liveLink: string
  mapLink: string
}

export type Announcement = {
  message: string
  linkText?: string | null
  linkUrl?: string | null
} | null

const FALLBACK: SiteInfo = {
  services: [{ name: 'Sunday Worship', day: 'Sunday', time: '10:30 AM', note: '' }],
  street: '2140 Cedar Hill Road',
  cityLine: 'Maple Grove, MD 20999',
  phone: '(301) 555-0142',
  phoneHref: 'tel:+13015550142',
  email: '',
  givingLink: '',
  liveLink: '',
  mapLink: '',
}

export const photo = (m: unknown, size: 'card' | 'large' = 'large'): Photo | null => {
  if (!m || typeof m !== 'object') return null
  const media = m as Media
  const url = media.sizes?.[size]?.url || media.url
  if (!url) return null
  return { url, alt: media.alt || '', caption: media.caption }
}

/** Used only when nobody has uploaded a photo for that spot yet. */
const stock = (key: StockKey, w = 2000, caption?: string): Photo => ({
  url: stockUrl(key, w),
  alt: STOCK[key].alt,
  caption,
})

export async function getPayloadClient() {
  return getPayload({ config })
}

export async function getSiteInfo(): Promise<{ info: SiteInfo; announcement: Announcement }> {
  const payload = await getPayloadClient()
  const [ci, an] = await Promise.all([
    payload.findGlobal({ slug: 'church-info' }),
    payload.findGlobal({ slug: 'announcement' }),
  ])

  const services = (ci.services || [])
    .filter((s) => s?.name && s?.time)
    .map((s) => ({ name: s.name, day: s.day, time: s.time, note: s.note }))
  const street = ci.street || FALLBACK.street
  const cityLine = ci.cityLine || FALLBACK.cityLine
  const phone = ci.phone || FALLBACK.phone
  const digits = phone.replace(/\D/g, '')

  const info: SiteInfo = {
    services: services.length ? services : FALLBACK.services,
    street,
    cityLine,
    phone,
    phoneHref: `tel:+${digits.length === 10 ? '1' + digits : digits}`,
    email: (ci as { email?: string | null }).email || '',
    givingLink: ci.givingLink || '',
    liveLink: ci.liveLink || '',
    mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street} ${cityLine}`)}`,
  }

  const expired = an.hideAfter
    ? new Date(an.hideAfter).setHours(23, 59, 59, 999) < Date.now()
    : false
  const announcement: Announcement =
    an.show && an.message && !expired
      ? { message: an.message, linkText: an.linkText, linkUrl: an.linkUrl }
      : null

  return { info, announcement }
}

const MINISTRY_STOCK: Record<string, StockKey> = {
  'Cedar Kids': 'kids',
  'Cedar Youth': 'youth',
  'Worship & Arts': 'band',
  'Small Groups': 'groups',
  'Prayer Team': 'prayer',
  'Neighbors Outreach': 'outreach',
}

export async function getHomeData() {
  const payload = await getPayloadClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [{ info, announcement }, events, sermons, leaders, ministries, photos] = await Promise.all([
    getSiteInfo(),
    payload.find({
      collection: 'events',
      where: {
        and: [
          { date: { greater_than_equal: today.toISOString() } },
          { approval: { not_equals: 'pending' } },
        ],
      },
      sort: 'date',
      limit: 6,
      depth: 2,
    }),
    payload.find({ collection: 'sermons', sort: '-date', limit: 3, depth: 0 }),
    payload.find({ collection: 'leaders', sort: 'order', limit: 12, depth: 1 }),
    payload.find({ collection: 'ministries', sort: 'order', limit: 12, depth: 1 }),
    payload.find({
      collection: 'media',
      where: { spot: { not_equals: 'library' } },
      sort: '-createdAt',
      limit: 60,
      depth: 0,
    }),
  ])

  const spot = (s: string) => photo(photos.docs.find((p) => p.spot === s))
  const gallery = photos.docs
    .filter((p) => p.spot === 'gallery')
    .slice(0, 3)
    .map((p) => photo(p, 'large'))
  const galleryFallback = [
    stock('congregation', 1600, 'Sunday mornings at Cedar Hill'),
    stock('laughing', 1600, 'Coffee after service'),
    stock('door', 1600, 'Come on in — the door is open'),
  ]

  return {
    info,
    announcement,
    events: events.docs.map((e, i) => ({
      id: String(e.id),
      title: e.title,
      date: e.date,
      time: e.time || '',
      location: e.location || '',
      details: e.details || '',
      link: e.link || '',
      flyer: photo(e.flyer, 'card'),
      ministry: typeof e.ministry === 'object' && e.ministry ? e.ministry.name : '',
      // Card image: flyer, then the ministry's photo, then a stock photo.
      image:
        photo(e.flyer, 'card') ??
        (typeof e.ministry === 'object' && e.ministry ? photo(e.ministry.photo, 'card') : null) ??
        stock(['congregation', 'laughing', 'outreach', 'door'][i % 4] as StockKey, 900),
    })),
    sermons: sermons.docs.map((s) => ({
      id: String(s.id),
      title: s.title,
      preacher: s.preacher || '',
      date: s.date,
      video: s.video || '',
      scripture: s.scripture || '',
      summary: s.summary || '',
    })),
    leaders: leaders.docs.map((raw) => {
      // Older demos saved the lead pastor as "Pastor Renee Walker". Show the current version instead.
      const legacy = raw.name === 'Pastor Renee Walker'
      const l = legacy ? { ...raw, ...LEAD_PASTORS, photo: null } : raw
      return {
        id: String(l.id),
        name: l.name,
        title: l.title || '',
        bio: l.bio || '',
        // Demo pastors fall back to their built-in portrait until a photo is uploaded.
        photo:
          photo(l.photo, 'card') ??
          (PORTRAITS[l.name]
            ? { url: `/demo/${PORTRAITS[l.name].file}`, alt: PORTRAITS[l.name].alt }
            : null),
      }
    }),
    ministries: ministries.docs.map((m) => ({
      id: String(m.id),
      name: m.name,
      tagline: m.tagline || '',
      meets: m.meets || '',
      about: m.about || '',
      leaderName: m.leaderName || '',
      photo:
        photo(m.photo, 'card') ??
        (MINISTRY_STOCK[m.name] ? stock(MINISTRY_STOCK[m.name], 900) : null),
    })),
    photos: {
      hero: spot('hero') ?? stock('hero'),
      // Header slideshow: newest 3 "hero" photos, topped up with stock photos.
      heroes: [
        ...photos.docs
          .filter((p) => p.spot === 'hero')
          .slice(0, 3)
          .map((p) => photo(p, 'large')),
        stock('hero'),
        stock('congregation'),
        stock('band'),
      ]
        .filter((p): p is Photo => Boolean(p))
        .slice(0, 3),
      visit: spot('visit') ?? stock('welcome', 1400),
      sermon: spot('sermon') ?? stock('bible', 1400),
      gallery: [0, 1, 2].map((i) => gallery[i] ?? galleryFallback[i]),
    },
  }
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>
