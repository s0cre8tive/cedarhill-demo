import React from 'react'

/** Small building blocks that keep the four forms consistent. */

export const Req = () => <span className="req">*</span>

export function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="sec">
      <legend className="sec-h">
        <i>{n}</i>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

export function Field({ label, hint, req, children }: { label: string; hint?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="lab">
        {label}
        {req && <Req />}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  )
}

export function Chips({
  legend,
  name,
  type = 'radio',
  options,
  defaultValue,
  required,
}: {
  legend?: React.ReactNode
  name: string
  type?: 'radio' | 'checkbox'
  options: Array<[value: string, label: string]>
  defaultValue?: string
  required?: boolean
}) {
  const chips = (
    <div className="chips">
      {options.map(([value, label], i) => (
        <label className="chip" key={value}>
          <input type={type} name={name} value={value} defaultChecked={defaultValue === value} required={required && i === 0} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
  if (!legend) return chips
  return (
    <fieldset className="sec" style={{ gap: 12 }}>
      <legend className="lab" style={{ marginBottom: 12 }}>
        {legend}
      </legend>
      {chips}
    </fieldset>
  )
}

export function NameEmail({ phoneRequired }: { phoneRequired?: boolean }) {
  return (
    <>
      <div className="row2">
        <Field label="First name" req>
          <input className="inp" type="text" name="first_name" autoComplete="given-name" required />
        </Field>
        <Field label="Last name" req>
          <input className="inp" type="text" name="last_name" autoComplete="family-name" required />
        </Field>
      </div>
      <div className="row2">
        <Field label="Email" req>
          <input className="inp" type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label="Phone" req={phoneRequired} hint={phoneRequired ? undefined : 'optional'}>
          <input className="inp" type="tel" name="phone" autoComplete="tel" required={phoneRequired} />
        </Field>
      </div>
    </>
  )
}

export function Consent({ name = 'consent', children }: { name?: string; children: React.ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} required />
      <span>
        {children}
        <span style={{ color: '#45498F' }}> *</span>
      </span>
    </label>
  )
}
