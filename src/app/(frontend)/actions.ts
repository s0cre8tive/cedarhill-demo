'use server'

import { headers } from 'next/headers'
import { getPayloadClient } from '@/lib/site'

/* Simple spam protection: max 5 submissions per person every 10 minutes. */
const WINDOW = 10 * 60 * 1000
const LIMIT = 5
const hits = new Map<string, number[]>()
function tooMany(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > LIMIT
}

type FormType = 'visit' | 'member' | 'salvation' | 'prayer' | 'connect' | 'card'

/** Friendly question labels so the inbox reads like a conversation, not a database. */
const LABELS: Record<FormType, Record<string, string>> = {
  visit: {
    visit_service: 'Planning to join us for',
    visit_date: 'Date',
    party_size: 'How many are coming',
    heard_from: 'Heard about us from',
    children: 'Bringing children',
    interests: 'Interested in',
    notes: 'Notes or questions',
    contact_pref: 'Best way to reach them',
  },
  member: {
    address: 'Street address',
    city: 'City',
    state: 'State',
    zip: 'ZIP',
    birthday: 'Birthday',
    attending: 'Attending Cedar Hill for',
    saved: 'Accepted Jesus as Lord and Savior',
    baptized: 'Baptized',
    join_type: 'Joining by',
    serve: 'Would love to serve in',
    family: 'Family members joining',
  },
  salvation: {
    decision: 'Their decision',
    decision_date: 'When',
    decision_where: 'Where',
    next: 'Would like help with',
    prayer: 'How we can pray',
  },
  connect: {
    interests: 'Wants to hear about',
    signup_from: 'Signed up from',
  },
  card: {
    visit: 'This is my',
    wants: 'I’d like to',
    service: 'Service',
    prayer: 'How we can pray',
  },
  prayer: {
    category: 'Praying for',
    request: 'Prayer request',
    callback: 'Wants someone to reach out',
    visibility: 'Who may see this',
  },
}

const VISIT: Record<string, string> = { first: 'First visit', few: 'Been a few times', home: 'Cedar Hill is home' }
const WANTS: Record<string, string> = {
  jesus: 'Know more about Jesus',
  group: 'Join a small group',
  serve: 'Serve on a team',
  baptism: 'Get baptized',
  member: 'Become a member',
}

const SKIP = new Set(['_started', 'service_date', 'website', 'consent', 'covenant', 'first_name', 'last_name', 'name', 'email', 'phone', 'contact', 'anonymous'])

const clean = (v: FormDataEntryValue | null, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

export type SubmitResult = { ok: true; first: string } | { ok: false; error: string }

export async function submitForm(type: FormType, formData: FormData): Promise<SubmitResult> {
  if (!LABELS[type]) return { ok: false, error: 'Unknown form.' }

  // Spam trap: real people never fill this hidden field.
  if (clean(formData.get('website'))) return { ok: true, first: '' }

  // Bots submit instantly; people take at least a few seconds.
  const started = Number(formData.get('_started'))
  if (started && Date.now() - started < 3000) return { ok: true, first: '' }

  const h = await headers()
  const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown').split(',')[0].trim()
  if (tooMany(ip)) return { ok: false, error: 'Too many forms sent at once. Please wait a few minutes and try again.' }

  const anonymous = type === 'prayer' && formData.get('anonymous') === 'on'
  const first = clean(formData.get('first_name'), 80)
  const last = clean(formData.get('last_name'), 80)
  let name = [first, last].filter(Boolean).join(' ') || clean(formData.get('name'), 120)
  let email = clean(formData.get('email'), 200)
  let phone = clean(formData.get('phone'), 40)

  if (type === 'prayer') {
    const contact = clean(formData.get('contact'), 200)
    if (contact.includes('@')) email = contact
    else if (contact) phone = contact
    if (!clean(formData.get('request'))) return { ok: false, error: 'Please share your prayer request.' }
  } else if (type === 'connect') {
    // The pop-up only asks for a first name and email.
    if (!first || !email) return { ok: false, error: 'Please add your first name and email.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email doesn’t look quite right.' }
  } else if (type === 'card') {
    // A connect card only needs a first name and one way to reach them.
    if (!first) return { ok: false, error: 'Please add your first name.' }
    if (!email && !phone) return { ok: false, error: 'Please add a phone number or email so we can say hello.' }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email doesn’t look quite right.' }
  } else if (!first || !last || !email) {
    return { ok: false, error: 'Please fill in your name and email.' }
  }

  if (anonymous) {
    name = 'Anonymous'
    email = ''
    phone = ''
  }

  // Turn every answer into "Question: answer" lines.
  const grouped = new Map<string, string[]>()
  for (const [key, value] of formData.entries()) {
    if (SKIP.has(key) || key.startsWith('$')) continue
    const v = clean(value)
    if (!v) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(v === 'on' ? 'Yes' : v)
  }
  const lines: string[] = []
  for (const [key, values] of grouped) {
    const label = LABELS[type][key] ?? key.replace(/_/g, ' ')
    let answer = values.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(', ')
    if (key === 'visit') answer = VISIT[values[0]] ?? answer
    if (key === 'wants') answer = values.map((v) => WANTS[v] ?? v).join(', ')
    if (key === 'visibility') answer = answer === 'pastors' ? 'Pastors only' : 'Pastors & prayer team'
    lines.push(`${label}: ${answer}`)
  }
  if (anonymous) lines.unshift('Submitted anonymously')

  const meta =
    type === 'card'
      ? {
          visit: clean(formData.get('visit'), 20) || 'first',
          wants: formData.getAll('wants').map((v) => clean(v, 20)).filter((v) => v in WANTS),
          serviceDate: clean(formData.get('service_date'), 10) || undefined,
        }
      : undefined

  const visibility = type === 'prayer' && formData.get('visibility') === 'pastors' ? 'pastors' : 'team'

  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'inbox',
      data: {
        formType: type,
        status: 'new',
        name: name || 'Not given',
        email,
        phone,
        summary: lines.join('\n'),
        visibility,
        ...(meta ? { meta } : {}),
      },
    })
  } catch (err) {
    console.error('Form submit failed', err)
    return { ok: false, error: 'Something went wrong sending your form. Please try again, or call the church office.' }
  }

  return { ok: true, first: anonymous ? '' : first || name.split(' ')[0] || '' }
}

export type SignUpResult = { ok: true; first: string; what: string } | { ok: false; error: string }

/** Event and serve sign-ups. Adds the person to People and checks there's still room. */
export async function signUp(kind: 'event' | 'serve', id: string, formData: FormData): Promise<SignUpResult> {
  if (clean(formData.get('website'))) return { ok: true, first: '', what: '' }
  const started = Number(formData.get('_started'))
  if (started && Date.now() - started < 2500) return { ok: true, first: '', what: '' }
  const h = await headers()
  const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown').split(',')[0].trim()
  if (tooMany(ip)) return { ok: false, error: 'Too many sign-ups at once. Please wait a few minutes and try again.' }

  const first = clean(formData.get('first_name'), 80)
  const last = clean(formData.get('last_name'), 80)
  const email = clean(formData.get('email'), 200)
  const phone = clean(formData.get('phone'), 40)
  const guests = Math.min(Math.max(Number(formData.get('guests')) || 1, 1), 12)
  if (!first || !last) return { ok: false, error: 'Please add your first and last name.' }
  if (!email && !phone) return { ok: false, error: 'Please add an email or phone number for your reminder.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email doesn’t look quite right.' }

  try {
    const payload = await getPayloadClient()
    const { signUpFor } = await import('@/lib/signups')
    const res = await signUpFor(payload, kind, id, { name: `${first} ${last}`, email, phone, guests })
    if (!res.ok) return res
    return { ok: true, first, what: res.what }
  } catch (err) {
    console.error('Sign-up failed', err)
    return { ok: false, error: 'Something went wrong. Please try again, or call the church office.' }
  }
}
