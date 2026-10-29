import type { GlobalConfig } from 'payload'
import { anyone, isStaff, hiddenForLeaders } from '../access'
import { logGlobal } from '../lib/changeLog'

export const ChurchInfo: GlobalConfig = {
  slug: 'church-info',
  label: 'Service Times & Contact',
  admin: {
    hideAPIURL: true,
    group: 'Website',
    hidden: hiddenForLeaders,
    description: 'Service times show in the scrolling banner, the Visit section and on every form.',
  },
  access: { read: anyone, update: isStaff },
  hooks: { afterChange: logGlobal('Service times & contact', 'church-info') },
  fields: [
    {
      name: 'services',
      label: 'Service times',
      type: 'array',
      labels: { singular: 'Service', plural: 'Services' },
      admin: { initCollapsed: false, components: { RowLabel: '@/components/admin/ServiceRowLabel#ServiceRowLabel' } },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Service name', type: 'text', required: true, admin: { width: '40%', placeholder: 'Sunday Worship' } },
            { name: 'day', label: 'Day', type: 'text', admin: { width: '25%', placeholder: 'Sunday' } },
            { name: 'time', label: 'Time', type: 'text', required: true, admin: { width: '35%', placeholder: '10:00 AM' } },
          ],
        },
        { name: 'note', label: 'Short note (optional)', type: 'text', admin: { placeholder: 'Kids check-in opens 10:10' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Address, phone & links',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'street', label: 'Street', type: 'text', admin: { width: '50%' } },
            { name: 'cityLine', label: 'City, State ZIP', type: 'text', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'phone', label: 'Phone', type: 'text', admin: { width: '50%' } },
            { name: 'email', label: 'Office email', type: 'text', admin: { width: '50%' } },
          ],
        },
        { name: 'givingLink', label: 'Online giving link', type: 'text' },
        { name: 'liveLink', label: 'Watch live link (optional)', type: 'text', admin: { description: 'Adds a "Watch Live" button to the top of the homepage.' } },
      ],
    },
  ],
}
