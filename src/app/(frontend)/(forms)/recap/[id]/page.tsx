import React from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/site'
import { recapBody, recapData } from '@/lib/recap'
import { FormShell, OtherSteps } from '../../FormShell'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sunday Recap · Cedar Hill', robots: { index: false } }

/** The web version of a Sunday Recap. Drafts can only be previewed by signed-in staff. */
export default async function RecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const r = await recapData(payload, id).catch(() => null)
  if (!r) notFound()
  let draft = false
  if (r.status !== 'sent') {
    const { user } = await payload.auth({ headers: await headers() })
    if (!user) notFound()
    draft = true
  }
  const week = new Date(r.weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return (
    <FormShell
      decor="arc"
      kicker={draft ? 'Sunday Recap · Draft preview' : 'Sunday Recap'}
      title={r.subject.replace(/^Sunday Recap:\s*/, '')}
      lede={`The week of ${week}. Everything from Sunday and everything coming up, in one place.`}
      aside={
        <>
          {draft && (
            <div className="info dark">
              <h3>Only staff can see this</h3>
              <p>This is a draft. Go back to the dashboard and press Send when it looks right.</p>
            </div>
          )}
          <div className="info">
            <h3>Get it every Monday</h3>
            <p>
              The Sunday Recap goes out by email each week. Sign up with the “Stay connected” box on{' '}
              <a href="/">our homepage</a>.
            </p>
          </div>
          <OtherSteps current="" />
        </>
      }
    >
      <div className="rc" dangerouslySetInnerHTML={{ __html: recapBody(r) }} />
    </FormShell>
  )
}
