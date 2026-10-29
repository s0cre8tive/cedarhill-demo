import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

/**
 * One "Recent changes" log for every way the site gets edited.
 * Today: the dashboard. Later: email updates write here too, with source "email".
 */
export type ChangeSource = 'dashboard' | 'email' | 'system'

type Entry = {
  summary: string
  area: string
  source?: ChangeSource
  status?: 'live' | 'pending' | 'blocked'
  href?: string
}

const who = (req: PayloadRequest) => {
  const u = req.user as unknown as { name?: string; email?: string } | null
  return u?.name || u?.email || 'System'
}

export async function logChange(req: PayloadRequest, e: Entry) {
  if (req.context?.skipLog) return
  try {
    await req.payload.create({
      collection: 'changes',
      overrideAccess: true,
      req,
      context: { skipLog: true },
      data: {
        summary: e.summary,
        area: e.area,
        source: e.source ?? (req.context?.source as ChangeSource) ?? 'dashboard',
        status: e.status ?? 'live',
        by: who(req),
        href: e.href,
      },
    })
  } catch (err) {
    req.payload.logger.error({ err, msg: 'Could not write change log' })
  }
}

type Opts = {
  area: string
  slug: string
  title: (doc: Record<string, unknown>) => string
  pending?: (doc: Record<string, unknown>) => boolean
}

export const logCollection = ({ area, slug, title, pending }: Opts) => {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    const name = title(doc) || 'Untitled'
    const isPending = pending?.(doc) ?? false
    const wasPending = previousDoc ? (pending?.(previousDoc) ?? false) : false
    let summary = operation === 'create' ? `${name} added to ${area}` : `${name} updated in ${area}`
    if (operation === 'update' && wasPending && !isPending) summary = `${name} approved and now live`
    await logChange(req, {
      area,
      summary,
      status: isPending ? 'pending' : 'live',
      href: `/admin/collections/${slug}/${doc.id}`,
    })
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    await logChange(req, { area, summary: `${title(doc) || 'An item'} removed from ${area}`, status: 'live' })
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const logGlobal = (label: string, slug: string): GlobalAfterChangeHook[] => [
  async ({ doc, req }) => {
    await logChange(req, { area: label, summary: `${label} updated`, href: `/admin/globals/${slug}` })
    return doc
  },
]
