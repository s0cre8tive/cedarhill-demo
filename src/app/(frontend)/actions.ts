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

type FormType = 'visit' | 'member' | 'salvation' | 'prayer'

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
  prayer: {
    category: 'Praying for',
    request: 'Prayer request',
    callback: 'Wants someone to reach out',
    visibility: 'Who may see this',
  },
}

const SKIP = new Set(['_started', 'website', 'consent', 'covenant', 'first_name', 'last_name', 'name', 'email', 'phone', 'contact', 'anonymous'])

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
    if (key === 'visibility') answer = answer === 'pastors' ? 'Pastors only' : 'Pastors & prayer team'
    lines.push(`${label}: ${answer}`)
  }
  if (anonymous) lines.unshift('Submitted anonymously')

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
      },
    })
  } catch (err) {
    console.error('Form submit failed', err)
    return { ok: false, error: 'Something went wrong sending your form. Please try again, or call the church office.' }
  }

  return { ok: true, first: anonymous ? '' : first || name.split(' ')[0] || '' }
}
