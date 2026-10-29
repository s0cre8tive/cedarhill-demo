import React from 'react'
import { getSiteInfo } from '@/lib/site'
import { FormShell, OtherSteps, TimesCard } from '../FormShell'
import { FormClient } from '../FormClient'
import { Chips, Consent, Field, NameEmail, Section } from '../fields'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plan your visit · Cedar Hill' }

export default async function VisitPage() {
  const { info } = await getSiteInfo()
  return (
    <FormShell
      decor="arc"
      kicker="Plan Your Visit"
      title={
        <>
          We saved you
          <br />
          <em>a seat.</em>
        </>
      }
      lede="Tell us a little about yourself and when you’re coming. A member of our welcome team will reach out, answer any questions, and be ready to greet you when you arrive."
      aside={
        <>
          <TimesCard info={info} />
          <div className="info">
            <h3>Where to find us</h3>
            <p>
              {info.street}
              <br />
              {info.cityLine}
              <br />
              {info.phone}
            </p>
          </div>
          <OtherSteps current="/visit" />
        </>
      }
    >
      <FormClient
        type="visit"
        label="Plan your visit form"
        submitLabel="Plan My Visit"
        fine="Fields marked * are required."
        successTitle="We can’t wait to meet you, {name}!"
        successText={`Thank you for planning your visit. Someone from our welcome team will reach out soon. We gather at ${info.street}, ${info.cityLine.split(',')[0]} — come as you are.`}
      >
        <Section n="01" title="About you">
          <NameEmail />
        </Section>
        <Section n="02" title="Your visit">
          <div className="row2">
            <Field label="When are you planning to join us?" req>
              <select className="inp" name="visit_service" required defaultValue="">
                <option value="">Choose a service</option>
                {info.services.map((s) => (
                  <option key={s.name + s.time}>{`${s.name.replace(/[“”"]/g, '')} · ${s.time}`}</option>
                ))}
                <option>Not sure yet</option>
              </select>
            </Field>
            <Field label="Date" hint="optional">
              <input className="inp" type="date" name="visit_date" />
            </Field>
          </div>
          <div className="row2">
            <Field label="How many are coming?">
              <select className="inp" name="party_size" defaultValue="Just me">
                {['Just me', '2', '3', '4', '5+'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="How did you hear about us?">
              <select className="inp" name="heard_from" defaultValue="">
                <option value="">Select one</option>
                {['Friend or family', 'Social media', 'Drove by', 'Neighbors Pantry', 'Online search', 'Other'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <Chips legend="Bringing children?" name="children" options={[['no', 'No'], ['yes', 'Yes']]} defaultValue="no" />
        </Section>
        <Section n="03" title="What interests you?">
          <Chips
            name="interests"
            type="checkbox"
            options={[
              ['Worship', 'Sunday Worship'],
              ['Small Groups', 'Small Groups'],
              ['Outreach', 'Neighbors Outreach'],
              ['Youth', 'Cedar Youth'],
              ['Kids', 'Cedar Kids'],
              ['Volunteering', 'Volunteering'],
            ]}
          />
          <Field label="Anything we should know, or a question for us?" hint="optional">
            <textarea className="inp" name="notes" />
          </Field>
          <Chips
            legend="Best way to reach you"
            name="contact_pref"
            options={[['email', 'Email'], ['text', 'Text'], ['call', 'Phone call']]}
            defaultValue="email"
          />
        </Section>
        <Consent>It’s okay for Cedar Hill to contact me about my visit. We never share your information.</Consent>
      </FormClient>
    </FormShell>
  )
}
