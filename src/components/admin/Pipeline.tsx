import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import React from 'react'
import { PipelineBoard, type Card } from './PipelineBoard'

type Rel = { id: string | number; name?: string | null } | string | number | null | undefined
const relId = (r: Rel) => (r && typeof r === 'object' ? r.id : r ?? null)

/** /admin/pipeline: everyone in People as cards, one column per follow-up stage. */
export async function Pipeline({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req
  const admin = payload.config.routes.admin
  if (!user) redirect(`${admin}/login?redirect=${encodeURIComponent(`${admin}/pipeline`)}`)
  // Volunteers only have Team Communication.
  if ((user as unknown as { role?: string }).role === 'volunteer') redirect(admin)

  const [people, tags, open] = await Promise.all([
    payload.find({ collection: 'people', limit: 1000, depth: 1, sort: '-updatedAt', user, overrideAccess: false }),
    payload.find({ collection: 'tags', limit: 300, sort: 'name', depth: 0, user, overrideAccess: false }),
    payload.find({ collection: 'follow-ups', where: { done: { not_equals: true } }, limit: 3000, depth: 0, sort: 'due', user, overrideAccess: false }),
  ])

  const nextDue = new Map<string, { due: string | null; count: number }>()
  for (const t of open.docs) {
    const pid = relId(t.person as Rel)
    if (pid == null) continue
    const k = String(pid)
    const cur = nextDue.get(k)
    if (!cur) nextDue.set(k, { due: (t.due as string) ?? null, count: 1 })
    else cur.count++
  }

  const cards: Card[] = people.docs.map((p) => {
    const a = p.assignedTo as Rel
    const n = nextDue.get(String(p.id))
    return {
      id: String(p.id),
      name: p.fullName || p.firstName || 'Unnamed',
      stage: p.stage || 'new-guest',
      tags: ((p.tags ?? []) as Rel[])
        .filter((t): t is { id: string | number; name?: string | null } => Boolean(t && typeof t === 'object'))
        .map((t) => ({ id: String(t.id), name: t.name || '' })),
      assignee: a && typeof a === 'object' ? { id: String(a.id), name: a.name || '' } : null,
      nextDue: n?.due ?? null,
      openCount: n?.count ?? 0,
    }
  })

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
      // Keeps the header bell (Cathedral) on this page too.
      viewActions={payload.config.admin?.components?.actions}
    >
      <div className="ch-pipe">
        <div className="ch-pipe__head">
          <div>
            <p className="ch-kicker">People · Follow-up pipeline</p>
            <h1>Pipeline board</h1>
            <p className="ch-welcome__sub">Drag a card to the next column, or use the arrows. Website forms add new guests here automatically.</p>
          </div>
        </div>
        <PipelineBoard
          admin={admin}
          cards={cards}
          tags={tags.docs.map((t) => ({ id: String(t.id), name: t.name }))}
          me={String(user!.id)}
        />
      </div>
    </DefaultTemplate>
  )
}
