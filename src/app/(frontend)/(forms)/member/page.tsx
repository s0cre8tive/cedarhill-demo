import React from 'react'
import { getSiteInfo } from '@/lib/site'
import { FormShell, OtherSteps } from '../FormShell'
import { FormClient } from '../FormClient'
import { Chips, Consent, Field, NameEmail, Section } from '../fields'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Become a member · Cedar Hill' }

export default async function MemberPage() {
  const { info } = await getSiteInfo()
  const sunday = info.services[0]
  return (
    <FormShell
      decor="arc"
      kicker="Become a Member"
      title={
        <>
          Find your place
          <br />
          in the <em>family.</em>
        </>
      }
      lede="Fill out this simple form and one of our ministry leaders will reach out to welcome you, answer your questions, and help you take your next step in community."
      aside={
        <>
          <div className="info dark">
            <h3>What happens next</h3>
            <ol className="steps">
              <li>
                <b>A leader reaches out</b> to welcome you and answer your questions.
              </li>
              <li>
                <b>Meet the pastors</b> and learn the heart and vision of Cedar Hill.
              </li>
              <li>
                <b>Find your fit</b> — connect with a ministry where you can grow and serve.
              </li>
            </ol>
          </div>
          <div className="info">
            <h3>Questions?</h3>
            <p>
              Call us at {info.phone}
              {sunday ? ` or talk with a greeter after ${sunday.name} at ${sunday.time.replace(':00', '')}.` : '.'}
            </p>
          </div>
          <OtherSteps current="/member" />
        </>
      }
    >
      <FormClient
        type="member"
        label="Membership form"
        submitLabel="Become a Member"
        fine="Fields marked * are required. Your information stays with Cedar Hill leadership."
        successTitle="Welcome home, {name}."
        successText="We’re so glad you’re joining the Cedar Hill family. A ministry leader will reach out within the week to welcome you and walk you through your next steps."
      >
        <Section n="01" title="Your information">
          <NameEmail phoneRequired />
          <Field label="Street address">
            <input className="inp" type="text" name="address" autoComplete="street-address" />
          </Field>
          <div className="row3">
            <Field label="City">
              <input className="inp" type="text" name="city" autoComplete="address-level2" />
            </Field>
            <Field label="State">
              <input className="inp" type="text" name="state" autoComplete="address-level1" defaultValue="MD" />
            </Field>
            <Field label="ZIP">
              <input className="inp" type="text" name="zip" inputMode="numeric" autoComplete="postal-code" />
            </Field>
          </div>
          <Field label="Birthday" hint="month & day — so we can celebrate you">
            <input className="inp" type="text" name="birthday" placeholder="e.g. March 14" />
          </Field>
        </Section>
        <Section n="02" title="Your journey">
          <Field label="How long have you been attending Cedar Hill?">
            <select className="inp" name="attending" defaultValue="">
              <option value="">Select one</option>
              {['This is my first time', 'Less than 6 months', '6 months – 1 year', 'More than a year', 'I watch online'].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Chips
            legend="Have you accepted Jesus Christ as your Lord and Savior?"
            name="saved"
            options={[['Yes', 'Yes'], ['Not yet', 'Not yet'], ['Would like to talk with someone', 'I’d like to talk with someone']]}
          />
          <Chips legend="Have you been baptized?" name="baptized" options={[['Yes', 'Yes'], ['No', 'No'], ['Interested', 'I’m interested']]} />
          <Chips
            legend="I’m joining by"
            name="join_type"
            options={[
              ['Profession of faith', 'Profession of faith'],
              ['Transfer from another church', 'Transfer from another church'],
              ['Returning member', 'Returning member'],
            ]}
          />
        </Section>
        <Section n="03" title="Where you’d love to serve">
          <Chips
            name="serve"
            type="checkbox"
            options={[
              ['Neighbors Outreach', 'Neighbors Outreach'],
              ['Hospitality & greeting', 'Hospitality & greeting'],
              ['Media & tech', 'Media & tech'],
              ['Worship & music', 'Worship & music'],
              ['Youth mentoring', 'Youth mentoring'],
              ['Tutoring & education', 'Tutoring & education'],
              ['Prayer team', 'Prayer team'],
              ['Cedar Kids', 'Cedar Kids'],
            ]}
          />
          <Field label="Family members joining with you" hint="optional — names & ages of children">
            <textarea className="inp" name="family" />
          </Field>
        </Section>
        <Consent name="covenant">
          I would like to become a member of Cedar Hill Church and agree to be contacted by a ministry leader.
        </Consent>
      </FormClient>
    </FormShell>
  )
}
