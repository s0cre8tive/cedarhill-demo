import React from 'react'
import { getSiteInfo } from '@/lib/site'
import { FormShell, OtherSteps } from '../FormShell'
import { FormClient } from '../FormClient'
import { Chips, Field, Section } from '../fields'
import { PrayerAbout } from './PrayerFields'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Prayer request · Cedar Hill' }

export default async function PrayerPage() {
  const { info } = await getSiteInfo()
  const bible = info.services.find((s) => /group|bible|wednesday/i.test(s.name))
  return (
    <FormShell
      decor="glow"
      kicker="Prayer Request"
      title={
        <>
          You don’t have to
          <br />
          carry it <em>alone.</em>
        </>
      }
      lede="Whether you need prayer for strength, healing, direction, or peace, we are here for you. Share as much or as little as you’d like — our prayer team will lift you up."
      aside={
        <>
          <div className="info dark">
            <p className="v">“Casting all your care upon him; for he careth for you.”</p>
            <small>1 Peter 5:7 (KJV)</small>
          </div>
          <div className="info">
            <h3>Pray with us</h3>
            <p>
              {bible ? `Join us ${bible.day ? bible.day + 's' : ''} at ${bible.time.replace(':00', '')} for groups and prayer, or call ${info.phone}.` : `Call us at ${info.phone}.`}
            </p>
          </div>
          <OtherSteps current="/prayer" />
        </>
      }
    >
      <FormClient
        type="prayer"
        label="Prayer request form"
        submitLabel="Send My Request"
        fine="Prayer requests are handled with care and kept confidential."
        successTitle="We’re praying with you."
        successText="Your request has been received and our team will lift it up in prayer. You are seen, you are loved, and you are not alone."
      >
        <Section n="01" title="What can we pray for?">
          <Chips
            name="category"
            type="checkbox"
            options={[
              ['Healing', 'Healing'],
              ['Strength', 'Strength'],
              ['Family', 'Family'],
              ['Direction', 'Direction'],
              ['Peace', 'Peace'],
              ['Finances', 'Finances'],
              ['Work', 'Work'],
              ['Salvation of a loved one', 'Salvation of a loved one'],
              ['Thanksgiving & praise', 'Thanksgiving & praise'],
            ]}
          />
          <Field label="Your prayer request" req>
            <textarea className="inp" name="request" required placeholder="Share what’s on your heart…" style={{ minHeight: 180 }} />
          </Field>
        </Section>
        <Section n="02" title="About you">
          <PrayerAbout />
          <Chips
            legend="Who may see this request?"
            name="visibility"
            options={[['pastors', 'Pastors only'], ['team', 'Pastors & prayer team']]}
            defaultValue="pastors"
          />
        </Section>
      </FormClient>
    </FormShell>
  )
}
