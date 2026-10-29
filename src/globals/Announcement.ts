import type { GlobalConfig } from 'payload'
import { anyone, isStaff, hiddenForLeaders } from '../access'
import { logGlobal } from '../lib/changeLog'

export const Announcement: GlobalConfig = {
  slug: 'announcement',
  label: 'Announcement Banner',
  admin: {
    hideAPIURL: true,
    group: 'Website',
    hidden: hiddenForLeaders,
    description: 'A thin banner across the very top of the website. Great for weather closings or a special service.',
  },
  access: { read: anyone, update: isStaff },
  hooks: { afterChange: logGlobal('Announcement banner', 'announcement') },
  fields: [
    {
      name: 'show',
      label: 'Show the banner on the website',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'message',
      label: 'Message',
      type: 'text',
      admin: { placeholder: 'e.g. Snow closing: Sunday service is online only this week.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'linkText', label: 'Button text (optional)', type: 'text', admin: { width: '40%', placeholder: 'Learn more' } },
        { name: 'linkUrl', label: 'Button link (optional)', type: 'text', admin: { width: '60%', placeholder: 'https://' } },
      ],
    },
    {
      name: 'hideAfter',
      label: 'Hide automatically after (optional)',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d, yyyy' }, description: 'The banner turns itself off after this day.' },
    },
  ],
}
