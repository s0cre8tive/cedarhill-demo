import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export type Role = 'admin' | 'editor' | 'leader' | 'volunteer'
type StaffUser = {
  id: string | number
  name?: string
  role?: Role | null
  ministry?: string | number | { id: string | number } | null
} | null

export const userOf = (req: PayloadRequest) => req.user as unknown as StaffUser
export const roleOf = (req: PayloadRequest): Role | null => userOf(req)?.role ?? null
export const ministryOf = (req: PayloadRequest) => {
  const m = userOf(req)?.ministry
  if (!m) return null
  return typeof m === 'object' ? m.id : m
}

export const anyone: Access = () => true
/** Anyone with a login, including volunteers. Only Team Communication uses this. */
export const isSignedIn: Access = ({ req }) => Boolean(req.user)
/**
 * Signed in with back-office access: Pastor / Admin, Office and Ministry Leaders.
 * Volunteers sign in too, but they only get Team Communication, so they never pass this.
 */
export const isLoggedIn: Access = ({ req }) => Boolean(req.user) && roleOf(req) !== 'volunteer'
export const hasBackOffice = (user: unknown) => Boolean(user) && (user as StaffUser)?.role !== 'volunteer'
export const isAdmin: Access = ({ req }) => roleOf(req) === 'admin'
/** Pastor / Admin and Office / Website Editor */
export const isStaff: Access = ({ req }) => roleOf(req) === 'admin' || roleOf(req) === 'editor'
export const isAdminField: FieldAccess = ({ req }) => roleOf(req) === 'admin'
export const isStaffField: FieldAccess = ({ req }) => roleOf(req) === 'admin' || roleOf(req) === 'editor'

export const isAdminOrSelf: Access = ({ req }) => {
  const user = userOf(req)
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Staff can touch everything; a ministry leader only things tagged to their ministry. */
export const staffOrOwnMinistry =
  (field = 'ministry'): Access =>
  ({ req }) => {
    const role = roleOf(req)
    if (role === 'admin' || role === 'editor') return true
    if (role === 'leader') {
      const m = ministryOf(req)
      if (!m) return false
      const where: Where = { [field]: { equals: m } }
      return where
    }
    return false
  }

/** Hide a collection from the side menu for ministry leaders (and volunteers, who see even less). */
export const hiddenForLeaders = ({ user }: { user: unknown }) => {
  const role = (user as StaffUser)?.role
  return role === 'leader' || role === 'volunteer'
}

/** Hide a collection from the side menu for volunteers. */
export const hiddenForVolunteers = ({ user }: { user: unknown }) => (user as StaffUser)?.role === 'volunteer'
