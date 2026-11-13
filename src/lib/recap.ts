import type { Payload } from 'payload'
import { sendBroadcast, canEmail, emailService } from './emailList'
import { teamLabel } from '../collections/ServeSlots'

const site = () => (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Monday of the current week (Eastern time), as noon UTC. */
export function thisMonday(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d
}

export function youTubeId(url?: string | null) {
  const m = String(url ?? '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)
  return m?.[1] ?? null
}

/** Serve shifts in the next 8 days that still need people. */
export async function openServeShifts(payload: Payload, from = new Date()) {
  const start = new Date(from)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 8)
  const slots = await payload.find({
    collection: 'serve-slots',
    where: { and: [{ date: { greater_than_equal: start.toISOString() } }, { date: { less_than: end.toISOString() } }] },
    sort: 'date',
    limit: 50,
    depth: 0,
  })
  const out: Array<{ id: string; label: string; team: string; date: string; time: string; open: number }> = []
  for (const s of slots.docs) {
    const taken = await payload.count({ collection: 'signups', where: { slot: { equals: s.id } } })
    const open = (s.spots ?? 0) - taken.totalDocs
    if (open > 0) out.push({ id: String(s.id), label: s.label ?? '', team: teamLabel(s.team), date: s.date, time: s.time ?? '', open })
  }
  return out
}

/** Creates this week's draft from the newest sermon, the next week of events and the banner. */
export async function draftRecap(payload: Payload, opts: { force?: boolean } = {}) {
  const monday = thisMonday()
  const existing = await payload.find({ collection: 'recaps', where: { weekOf: { equals: monday.toISOString() } }, limit: 1, depth: 0 })
  if (existing.docs[0] && !opts.force) return existing.docs[0]

  const end = new Date(monday)
  end.setUTCDate(end.getUTCDate() + 8)
  const [sermon, events, an] = await Promise.all([
    payload.find({ collection: 'sermons', sort: '-date', limit: 1, depth: 0 }),
    payload.find({
      collection: 'events',
      where: { and: [{ date: { greater_than_equal: new Date().toISOString().slice(0, 10) } }, { date: { less_than: end.toISOString() } }, { approval: { equals: 'live' } }] },
      sort: 'date',
      limit: 4,
      depth: 0,
    }),
    payload.findGlobal({ slug: 'announcement' }),
  ])
  const s = sermon.docs[0]
  const data = {
    subject: s ? `Sunday Recap: ${s.title.replace(/^.*?:\s*/, '')}` : 'Your Sunday Recap',
    pastorNote:
      'Thank you for worshiping with us this Sunday. Whether you were in the room or watching from home, you’re part of this family. Here’s what you need for the week ahead. See you Wednesday night!\n\nPastors Jacob & Renee',
    sermon: s?.id,
    weekOf: monday.toISOString(),
    events: events.docs.map((e) => e.id),
    announcement: an.show && an.message ? an.message : '',
    showServe: true,
    status: 'draft',
  }
  if (existing.docs[0]) return payload.update({ collection: 'recaps', id: existing.docs[0].id, data: data as never, context: { skipLog: true } })
  return payload.create({ collection: 'recaps', data: data as never, context: { skipLog: true } })
}

export async function recapData(payload: Payload, id: string | number) {
  const r = await payload.findByID({ collection: 'recaps', id, depth: 1, overrideAccess: true })
  const s = r.sermon && typeof r.sermon === 'object' ? r.sermon : null
  const vid = youTubeId(s?.video)
  return {
    id: String(r.id),
    subject: r.subject,
    status: r.status,
    weekOf: r.weekOf,
    note: r.pastorNote ?? '',
    announcement: r.announcement ?? '',
    sermon: s
      ? {
          title: s.title,
          preacher: s.preacher ?? '',
          scripture: s.scripture ?? '',
          summary: s.summary ?? '',
          video: s.video ?? '',
          thumb: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null,
          clips: (s.clips ?? []).map((c) => ({ title: c.title, at: c.at })),
        }
      : null,
    events: ((r.events ?? []) as unknown[])
      .filter((e): e is { id: string | number; title: string; date: string; time?: string | null; location?: string | null; signUp?: boolean | null } => Boolean(e && typeof e === 'object'))
      .map((e) => ({ id: String(e.id), title: e.title, date: e.date, time: e.time ?? '', location: e.location ?? '', signUp: Boolean(e.signUp) })),
    serve: r.showServe ? await openServeShifts(payload, new Date(r.weekOf)) : [],
  }
}
export type RecapData = Awaited<ReturnType<typeof recapData>>

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

/** Simple, inline-styled HTML that looks right in Gmail, Outlook and phones. */
export function recapHtml(r: RecapData) {
  return `<!doctype html><html><body style="margin:0;background:#F3EFFC;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">${recapBody(r)}</body></html>`
}

/** The recap itself, without the page around it (also used for the web version). */
export function recapBody(r: RecapData) {
  const url = site()
  const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#C2410C;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;font-size:15px">${esc(label)}</a>`
  const h2 = (t: string) => `<h2 style="font-family:Impact,Anton,Arial Narrow,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.5px;font-size:24px;color:#1C1633;margin:32px 0 12px">${esc(t)}</h2>`
  const p = (t: string) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#3d3857">${esc(t).replace(/\n/g, '<br>')}</p>`
  const parts: string[] = []
  parts.push(`<div style="background:#1C1633;padding:28px 28px 24px;border-radius:18px 18px 0 0"><p style="margin:0;color:#FF8A5B;font-weight:800;letter-spacing:3px;font-size:12px;text-transform:uppercase">Cedar Hill Church · Sunday Recap</p><h1 style="margin:8px 0 0;font-family:Impact,Anton,Arial Narrow,sans-serif;font-weight:400;text-transform:uppercase;font-size:34px;line-height:1.05;color:#ffffff">${esc(r.subject.replace(/^Sunday Recap:\s*/, ''))}</h1></div>`)
  parts.push('<div style="background:#ffffff;padding:8px 28px 28px;border-radius:0 0 18px 18px">')
  if (r.note) parts.push(`<div style="margin-top:20px">${p(r.note)}</div>`)
  if (r.announcement) parts.push(`<div style="background:#FFEDE2;border-radius:12px;padding:14px 16px;margin-top:16px">${p(r.announcement)}</div>`)
  if (r.sermon) {
    parts.push(h2('Missed Sunday? Catch up'))
    if (r.sermon.thumb) parts.push(`<a href="${url}/watch"><img src="${r.sermon.thumb}" alt="" width="100%" style="display:block;border-radius:12px;max-width:540px"></a>`)
    parts.push(`<p style="margin:12px 0 4px;font-size:18px;font-weight:800;color:#1C1633">${esc(r.sermon.title)}</p>`)
    parts.push(p([r.sermon.preacher, r.sermon.scripture].filter(Boolean).join(' · ')))
    if (r.sermon.summary) parts.push(p(r.sermon.summary))
    parts.push(btn(`${url}/watch`, 'Watch the message'))
  }
  if (r.events.length) {
    parts.push(h2('This week at Cedar Hill'))
    for (const e of r.events)
      parts.push(`<p style="margin:0 0 10px;font-size:16px;color:#3d3857"><b style="color:#1C1633">${esc(e.title)}</b><br>${esc([day(e.date), e.time, e.location].filter(Boolean).join(' · '))}${e.signUp ? ` · <a href="${url}/events/${e.id}" style="color:#C2410C;font-weight:700">Sign up</a>` : ''}</p>`)
  }
  if (r.serve.length) {
    parts.push(h2('Serve this week'))
    for (const s of r.serve) parts.push(p(`${s.team} · ${day(s.date)}${s.time ? ` · ${s.time}` : ''}: ${s.open} ${s.open === 1 ? 'spot' : 'spots'} open`))
    parts.push(btn(`${url}/serve`, 'Grab a spot'))
  }
  parts.push(`<p style="margin:28px 0 0;font-size:13px;color:#8a84a3">Read this on the web: <a href="${url}/recap/${r.id}" style="color:#5B3FD9">${url.replace(/^https?:\/\//, '')}/recap</a></p>`)
  parts.push('</div>')
  return `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif">${parts.join('')}</div>`
}

/** Sends the recap through Kit or Mailchimp, or (with Resend) straight to People on the Email list. */
export async function sendRecap(payload: Payload, id: string, by: string) {
  const r = await recapData(payload, id)
  const html = recapHtml(r)
  const preview = r.note.split('\n')[0].slice(0, 120)
  let note: string
  let ok = true
  const result = await sendBroadcast({ subject: r.subject, html, previewText: preview })
  if (result) {
    ok = result.ok
    note = result.ok ? `Emailed through ${result.service}` : `${result.service} didn’t accept it: ${result.error}`
  } else if (canEmail()) {
    const tag = await payload.find({ collection: 'tags', where: { name: { equals: 'Email list' } }, limit: 1, depth: 0 })
    const people = tag.docs[0]
      ? await payload.find({ collection: 'people', where: { and: [{ tags: { in: [tag.docs[0].id] } }, { email: { exists: true } }] }, limit: 500, depth: 0 })
      : { docs: [] }
    let n = 0
    for (const person of people.docs) {
      if (!person.email) continue
      await payload.sendEmail({ to: person.email, subject: r.subject, html }).then(() => n++).catch(() => null)
    }
    note = `Emailed to ${n} ${n === 1 ? 'person' : 'people'} on the Email list`
  } else {
    note = 'Published on the website. Connect Kit or Mailchimp to email it.'
  }
  if (ok) {
    await payload.update({
      collection: 'recaps',
      id,
      data: { status: 'sent', sentAt: new Date().toISOString(), sentNote: note } as never,
      context: { skipLog: true },
    })
  }
  await payload.create({
    collection: 'changes',
    context: { skipLog: true },
    data: { summary: `Sunday Recap “${r.subject}”: ${note}`, area: 'Sunday Recap', source: 'dashboard', status: ok ? 'live' : 'blocked', by, href: `/admin/collections/recaps/${id}` } as never,
  })
  return { ok, note, service: emailService() }
}
