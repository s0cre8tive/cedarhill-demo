import { APIError, type CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isAdminOrSelf, isLoggedIn } from '../access'

/**
 * Staff who can sign in at /admin.
 * - Pastor / Admin: everything, including private prayer requests and adding staff.
 * - Office / Website Editor: updates the website, approves ministry posts, works the inbox
 *   (except pastors-only prayers).
 * - Ministry Leader: posts events for their own ministry (held for approval) and updates
 *   their ministry's details. No inbox access.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff Member', plural: 'Staff' },
  admin: {
    hideAPIURL: true,
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
    group: 'People',
    description: 'People who can sign in and update the website.',
    hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin',
  },
  auth: {
    // Lock the account for 15 minutes after 5 wrong passwords.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    // Signed-in sessions last one work day.
    tokenExpiration: 60 * 60 * 10,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  access: {
    // Staff can see each other's names so they can assign follow-ups.
    read: isLoggedIn,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Strong passwords only.
        const pw = (data as { password?: string } | undefined)?.password
        if (pw && (pw.length < 10 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))) {
          throw new APIError('Passwords need at least 10 characters, including letters and a number.', 400, undefined, true)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // The very first person to sign up becomes the Pastor / Admin.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) {
            // Optional safety: only this email may create the very first account.
            const allowed = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase()
            if (allowed && String(data.email).trim().toLowerCase() !== allowed) {
              throw new APIError('This email is not allowed to set up the dashboard.', 403, undefined, true)
            }
            data.role = 'admin'
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      label: 'Full name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      label: 'Access level',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Pastor / Admin (sees everything)', value: 'admin' },
        { label: 'Office / Website Editor', value: 'editor' },
        { label: 'Ministry Leader (own ministry only)', value: 'leader' },
      ],
      access: { update: isAdminField },
      admin: { position: 'sidebar', isClearable: false },
    },
    {
      name: 'ministry',
      label: 'Their ministry',
      type: 'relationship',
      relationTo: 'ministries',
      access: { update: isAdminField },
      admin: {
        position: 'sidebar',
        condition: (data) => data?.role === 'leader',
        description: 'Ministry leaders can only post events for this ministry.',
      },
    },
  ],
}
