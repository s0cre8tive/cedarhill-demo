import type { CollectionConfig } from 'payload'
import { isSignedIn, isStaff, hiddenForLeaders } from '../access'
import { cathedral, hiddenUnlessCathedral } from '../lib/team'

/**
 * Campuses (Cathedral). A church with one campus never has to think about this:
 * the campus filter only appears once a second campus is added.
 */
export const Campuses: CollectionConfig = {
  slug: 'campuses',
  labels: { singular: 'Campus', plural: 'Campuses' },
  admin: {
    hideAPIURL: true,
    group: 'Team',
    useAsTitle: 'name',
    description: 'More than one location? Add each campus here. Teams and team announcements can then be filtered by campus.',
    hidden: (args) => hiddenUnlessCathedral() || hiddenForLeaders(args),
  },
  defaultSort: 'name',
  access: { read: cathedral(isSignedIn), create: cathedral(isStaff), update: cathedral(isStaff), delete: cathedral(isStaff) },
  fields: [{ name: 'name', label: 'Campus name', type: 'text', required: true, admin: { placeholder: 'e.g. Maple Grove' } }],
}
