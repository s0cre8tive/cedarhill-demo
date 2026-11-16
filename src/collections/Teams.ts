import type { Access, CollectionConfig, Where } from 'payload'
import { isStaff, hiddenForLeaders, userOf } from '../access'
import { cathedral, hiddenUnlessCathedral, isTeamStaff } from '../lib/team'

/** Staff see every team. Everyone else sees only the teams they lead or belong to. */
const readTeams: Access = ({ req }) => {
  const user = userOf(req)
  if (!user) return false
  if (isTeamStaff(req)) return true
  const where: Where = { or: [{ leader: { equals: user.id } }, { members: { in: [user.id] } }] }
  return where
}

/** One space per team: Worship, Youth, Kids, Guest Care, Facilities, Office… */
export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: { singular: 'Team', plural: 'Manage teams' },
  admin: {
    hideAPIURL: true,
    group: 'Team',
    useAsTitle: 'name',
    defaultColumns: ['name', 'leader', 'members', 'campus'],
    description: 'Who is on each team and who leads it. Each team gets its own space under Teams in the menu.',
    hidden: (args) => hiddenUnlessCathedral() || hiddenForLeaders(args),
  },
  defaultSort: 'name',
  access: { read: cathedral(readTeams), create: cathedral(isStaff), update: cathedral(isStaff), delete: cathedral(isStaff) },
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        // A team's space goes with it.
        await req.payload.delete({ collection: 'team-posts', where: { team: { equals: doc.id } }, overrideAccess: true, req })
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Team name', type: 'text', required: true, admin: { placeholder: 'e.g. Worship' } },
    { name: 'description', label: 'What this team does', type: 'text', admin: { placeholder: 'One line, e.g. Sunday music, sound and slides' } },
    {
      type: 'row',
      fields: [
        { name: 'leader', label: 'Team leader', type: 'relationship', relationTo: 'users', admin: { width: '50%' } },
        {
          name: 'campus',
          label: 'Campus (optional)',
          type: 'relationship',
          relationTo: 'campuses',
          admin: { width: '50%', description: 'Leave empty if the team serves the whole church.' },
        },
      ],
    },
    {
      name: 'members',
      label: 'Team members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { description: 'Volunteers need a login first: add them under People → Staff with the Volunteer access level.' },
    },
  ],
}
