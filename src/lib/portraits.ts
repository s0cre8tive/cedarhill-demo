import type { Payload } from 'payload'
import { readFile } from 'fs/promises'
import path from 'path'

/** Portraits live in /public/demo and are copied into Photos when content loads. */
export const PORTRAITS: Record<string, { file: string; alt: string }> = {
  'Pastors Jacob & Renee Walker': {
    file: 'jacob-renee-walker.jpg',
    alt: 'Pastors Jacob and Renee Walker standing together, both in black, with a cross on the wall behind them',
  },
  'Rev. Daniel Okafor': { file: 'daniel-okafor.jpg', alt: 'Rev. Daniel Okafor smiling, wearing a navy suit' },
  'Marcus Reed': { file: 'marcus-reed.jpg', alt: 'Marcus Reed smiling, wearing a black jacket' },
}

async function readDemoFile(file: string): Promise<Buffer | null> {
  // On your computer the file is right in /public.
  try {
    return await readFile(path.join(process.cwd(), 'public', 'demo', file))
  } catch {}
  // Online, /public is served by the site itself, so fetch it from there.
  const hosts = [
    process.env.NEXT_PUBLIC_SERVER_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ].filter(Boolean) as string[]
  for (const host of hosts) {
    try {
      const res = await fetch(`${host.replace(/\/$/, '')}/demo/${file}`, { signal: AbortSignal.timeout(15000) })
      if (res.ok) return Buffer.from(await res.arrayBuffer())
    } catch {}
  }
  return null
}

export async function loadPortrait(payload: Payload, name: string) {
  const p = PORTRAITS[name]
  if (!p) return undefined
  // Reuse the copy already in Photos, if there is one.
  const stem = `cedarhill-${p.file.replace(/\.jpg$/, '')}`
  const existing = await payload.find({ collection: 'media', where: { filename: { contains: stem } }, limit: 1, depth: 0 })
  if (existing.docs[0]) return existing.docs[0].id
  const data = await readDemoFile(p.file)
  if (!data) {
    payload.logger.warn(`Portrait for ${name} could not be loaded. A monogram will show instead.`)
    return undefined
  }
  const doc = await payload.create({
    collection: 'media',
    context: { skipLog: true },
    data: { alt: p.alt, spot: 'library' } as never,
    file: { data, mimetype: 'image/jpeg', name: `cedarhill-${p.file}`, size: data.length },
  })
  return doc.id
}

const norm = (n: string) => n.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

/** Finds a built-in portrait even if the name was retyped (e.g. "and" instead of "&"). */
export function portraitFor(name: string) {
  const key = Object.keys(PORTRAITS).find((k) => norm(k) === norm(name))
  return key ? PORTRAITS[key] : undefined
}
