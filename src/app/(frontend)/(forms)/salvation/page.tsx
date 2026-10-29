import React from 'react'
import { getSiteInfo } from '@/lib/site'
import { FormShell, OtherSteps } from '../FormShell'
import { FormClient } from '../FormClient'
import { Chips, Consent, Field, NameEmail, Req, Section } from '../fields'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'I said yes · Cedar Hill' }

const NEXT = [
  ['Talk with a pastor', 'A personal call to celebrate and pray with you.'],
  ['Learn about baptism', 'What it means and how to take that step.'],
  ['Get a Bible', 'We’d love to give you one to start reading.'],
  ['New believers class', 'Grow in the basics of your new faith.'],
]

export default async function SalvationPage() {
  const { info } = await getSiteInfo()
  const times = info.services
    .slice(0, 2)
    .map((s) => `${s.day ? s.day + 's' : s.name} at ${s.time.replace(':00', '')}`)
    .join(' and ')
  return (
    <FormShell
      decor="rays"
      kicker="Salvation"
      title={
        <>
          Heaven is <em>rejoicing.</em>
        </>
      }
      lede="We are ecstatic that you have decided to receive Jesus Christ into your life. All the angels in heaven are rejoicing — and so are we. Share a little with us so we can celebrate and walk with you."
      extra={
        <p className="verse">
          “Therefore if any man be in Christ, he is a new creature.”<small>2 Corinthians 5:17 (KJV)</small>
        </p>
      }
      aside={
        <>
          <div className="info dark">
            <h3>You’re not alone</h3>
            <p>Following Jesus is a journey, and we’d be honored to walk it with you. Join us {times}.</p>
          </div>
          <div className="info">
            <h3>Talk to someone now</h3>
            <p>Call {info.phone}, or find a pastor after Sunday Worship.</p>
          </div>
          <OtherSteps current="/salvation" />
        </>
      }
    >
      <FormClient
        type="salvation"
        label="Salvation form"
        submitLabel="Share My Decision"
        fine="Your information goes only to our pastoral team."
        successTitle="Welcome to the family, {name}!"
        successText="This is the best decision you will ever make. A member of our pastoral team will reach out soon to celebrate with you, pray with you, and help you take your next steps."
        secondary={{ href: '/visit', label: 'Plan a visit' }}
      >
        <Section n="01" title="Tell us about you">
          <NameEmail />
        </Section>
        <Section n="02" title="Your decision">
          <Chips
            legend={
              <>
                Which best describes you?
                <Req />
              </>
            }
            name="decision"
            required
            options={[
              ['Accepted Jesus for the first time', 'I accepted Jesus for the first time'],
              ['Rededicated my life to Christ', 'I rededicated my life to Christ'],
              ['Has questions about faith', 'I have questions about faith'],
            ]}
          />
          <div className="row2">
            <Field label="When did you make this decision?">
              <input className="inp" type="date" name="decision_date" />
            </Field>
            <Field label="Where?">
              <select className="inp" name="decision_where" defaultValue="At a Cedar Hill service">
                {['At a Cedar Hill service', 'Watching online', 'At home or elsewhere'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
        <Section n="03" title="Your next steps">
          <p className="fine" style={{ marginTop: -8, maxWidth: 'none' }}>
            Choose anything you’d like help with — there’s no pressure.
          </p>
          <div className="opts">
            {NEXT.map(([b, s]) => (
              <label className="opt" key={b}>
                <input type="checkbox" name="next" value={b} />
                <div>
                  <b>{b}</b>
                  <span>{s}</span>
                </div>
              </label>
            ))}
          </div>
          <Field label="How can we pray for you?" hint="optional">
            <textarea className="inp" name="prayer" />
          </Field>
        </Section>
        <Consent>It’s okay for a Cedar Hill pastor or ministry leader to contact me.</Consent>
      </FormClient>
    </FormShell>
  )
}
