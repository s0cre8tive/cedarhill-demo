import { createHash } from 'crypto'

/**
 * Sends a "Stay connected" sign-up to the church's email service so it can send the
 * weekly note. Set ONE of these in Vercel → Settings → Environment Variables:
 *
 *   Kit (recommended, free up to 10,000 subscribers)
 *     KIT_API_KEY   Kit → Settings → Developer → API keys (v4)
 *     KIT_TAG_ID    optional: the number of a tag, e.g. "Website sign-up"
 *
 *   Mailchimp
 *     MAILCHIMP_API_KEY       Mailchimp → Profile → Extras → API keys (ends in -us21 etc.)
 *     MAILCHIMP_AUDIENCE_ID   Audience → Settings → Audience name and defaults → Audience ID
 *
 * With neither set, sign-ups still land in the Inbox and People; nothing is sent anywhere.
 */
export type Subscriber = { email: string; firstName?: string; lastName?: string }
export type SyncResult = { service: 'Kit' | 'Mailchimp'; ok: true } | { service: 'Kit' | 'Mailchimp'; ok: false; error: string } | null

const TIMEOUT = 8000

export function emailService(): 'Kit' | 'Mailchimp' | null {
  if (process.env.KIT_API_KEY) return 'Kit'
  if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID) return 'Mailchimp'
  return null
}

async function kit(s: Subscriber) {
  const base = process.env.KIT_API_BASE || 'https://api.kit.com/v4'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Kit-Api-Key': process.env.KIT_API_KEY! }
  // Creates the subscriber, or updates their first name if they're already on the list.
  const res = await fetch(`${base}/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_address: s.email, first_name: s.firstName || null }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) throw new Error(`Kit said ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const tag = process.env.KIT_TAG_ID
  if (tag) {
    const t = await fetch(`${base}/tags/${encodeURIComponent(tag)}/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email_address: s.email }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!t.ok) throw new Error(`Kit tag said ${t.status}: ${(await t.text()).slice(0, 200)}`)
  }
}

async function mailchimp(s: Subscriber) {
  const key = process.env.MAILCHIMP_API_KEY!
  const dc = key.split('-').pop()
  const base = process.env.MAILCHIMP_API_BASE || `https://${dc}.api.mailchimp.com/3.0`
  const list = process.env.MAILCHIMP_AUDIENCE_ID!
  const hash = createHash('md5').update(s.email.toLowerCase()).digest('hex')
  const headers = { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`cedarhill:${key}`).toString('base64')}` }
  // PUT adds them, or updates them if they're already in the audience (without re-subscribing someone who left).
  const res = await fetch(`${base}/lists/${list}/members/${hash}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email_address: s.email,
      status_if_new: 'subscribed',
      merge_fields: { FNAME: s.firstName || '', LNAME: s.lastName || '' },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) throw new Error(`Mailchimp said ${res.status}: ${(await res.text()).slice(0, 200)}`)
  await fetch(`${base}/lists/${list}/members/${hash}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tags: [{ name: 'Website sign-up', status: 'active' }] }),
    signal: AbortSignal.timeout(TIMEOUT),
  }).catch(() => null)
}

export async function addToEmailList(s: Subscriber): Promise<SyncResult> {
  const service = emailService()
  if (!service || !s.email) return null
  try {
    if (service === 'Kit') await kit(s)
    else await mailchimp(s)
    return { service, ok: true }
  } catch (err) {
    return { service, ok: false, error: (err as Error).message }
  }
}

export type Broadcast = { subject: string; html: string; previewText?: string; fromName?: string; replyTo?: string }

/** Sends one email (the Sunday Recap) to everyone on the church's list in Kit or Mailchimp. */
export async function sendBroadcast(b: Broadcast): Promise<SyncResult> {
  const service = emailService()
  if (!service) return null
  try {
    if (service === 'Kit') {
      const base = process.env.KIT_API_BASE || 'https://api.kit.com/v4'
      const tag = process.env.KIT_TAG_ID
      const res = await fetch(`${base}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Kit-Api-Key': process.env.KIT_API_KEY! },
        body: JSON.stringify({
          subject: b.subject,
          content: b.html,
          preview_text: b.previewText ?? '',
          description: b.subject,
          public: false,
          send_at: new Date(Date.now() + 60_000).toISOString(),
          ...(tag ? { subscriber_filter: [{ all: [{ type: 'tag', ids: [Number(tag)] }] }] } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT),
      })
      if (!res.ok) throw new Error(`Kit said ${res.status}: ${(await res.text()).slice(0, 200)}`)
    } else {
      const key = process.env.MAILCHIMP_API_KEY!
      const base = process.env.MAILCHIMP_API_BASE || `https://${key.split('-').pop()}.api.mailchimp.com/3.0`
      const headers = { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`cedarhill:${key}`).toString('base64')}` }
      const call = async (path: string, method: string, body?: unknown) => {
        const r = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(TIMEOUT) })
        if (!r.ok) throw new Error(`Mailchimp said ${r.status}: ${(await r.text()).slice(0, 200)}`)
        return r.status === 204 ? null : r.json()
      }
      const camp = (await call('/campaigns', 'POST', {
        type: 'regular',
        recipients: { list_id: process.env.MAILCHIMP_AUDIENCE_ID },
        settings: { subject_line: b.subject, preview_text: b.previewText ?? '', title: b.subject, from_name: b.fromName ?? 'Cedar Hill Church', reply_to: b.replyTo ?? process.env.EMAIL_FROM ?? '' },
      })) as { id: string }
      await call(`/campaigns/${camp.id}/content`, 'PUT', { html: b.html })
      await call(`/campaigns/${camp.id}/actions/send`, 'POST')
    }
    return { service, ok: true }
  } catch (err) {
    return { service, ok: false, error: (err as Error).message }
  }
}

/** True when the site can send its own emails (reminders, confirmations) through Resend. */
export const canEmail = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
