import { notFound, redirect } from 'next/navigation'
import { getPayloadClient } from '@/lib/site'

export const dynamic = 'force-dynamic'

/** /recap always opens the newest Sunday Recap. */
export default async function LatestRecap() {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'recaps', where: { status: { equals: 'sent' } }, sort: '-weekOf', limit: 1, depth: 0 })
  if (!res.docs[0]) notFound()
  redirect(`/recap/${res.docs[0].id}`)
}
