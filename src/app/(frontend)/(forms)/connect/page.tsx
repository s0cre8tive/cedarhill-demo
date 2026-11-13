import React from 'react'
import { getSiteInfo } from '@/lib/site'
import { FormShell, OtherSteps, TimesCard } from '../FormShell'
import { FormClient } from '../FormClient'
import { Chips, Field, Section } from '../fields'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Connect card · Cedar Hill' }

/** The digital connect card. Scan the QR code on Sunday, fill it out in about a minute. */
export default async function ConnectCardPage() {
  const { info } = await getSiteInfo()
  return (
    <FormShell
      decor="glow"
      kicker="Connect Card"
      title={
        <>
          We’re glad
          <br />
          you’re <em>here.</em>
        </>
      }
      lede="Takes about a minute. Tell us who you are and what you’d like next, and a real person will follow up this week."
      aside={
        <>
          <div className="info dark">
            <p className="v">“Wherefore receive ye one another, as Christ also received us to the glory of God.”</p>
            <small>Romans 15:7 (KJV)</small>
          </div>
          <TimesCard info={info} />
          <OtherSteps current="/connect" />
        </>
      }
    >
      <FormClient
        type="card"
        label="Connect card"
        submitLabel="Send my card"
        fine="Only your first name and a phone number or email are needed. We never share your information."
        successTitle="Thank you, {name}!"
        successText="Your card is in. You’re checked in for today, and someone from our team will reach out this week. Enjoy the service!"
        secondary={{ href: '/watch', label: 'Watch past messages' }}
      >
        <Section n="01" title="About you">
          <div className="row2">
            <Field label="First name" req>
              <input className="inp" type="text" name="first_name" autoComplete="given-name" required />
            </Field>
            <Field label="Last name" hint="optional">
              <input className="inp" type="text" name="last_name" autoComplete="family-name" />
            </Field>
          </div>
          <div className="row2">
            <Field label="Mobile phone" hint="phone or email">
              <input className="inp" type="tel" name="phone" autoComplete="tel" inputMode="tel" />
            </Field>
            <Field label="Email" hint="phone or email">
              <input className="inp" type="email" name="email" autoComplete="email" />
            </Field>
          </div>
        </Section>
        <Section n="02" title="Today is my">
          <Chips
            name="visit"
            options={[
              ['first', 'First visit'],
              ['few', 'Been a few times'],
              ['home', 'Cedar Hill is home'],
            ]}
            defaultValue="first"
          />
        </Section>
        <Section n="03" title="I’d like to">
          <Chips
            name="wants"
            type="checkbox"
            options={[
              ['jesus', 'Know more about Jesus'],
              ['group', 'Join a small group'],
              ['serve', 'Serve on a team'],
              ['baptism', 'Get baptized'],
              ['member', 'Become a member'],
            ]}
          />
          <Field label="How can we pray for you?" hint="optional · our pastors and care team read these">
            <textarea className="inp" name="prayer" style={{ minHeight: 110 }} />
          </Field>
        </Section>
      </FormClient>
    </FormShell>
  )
}
