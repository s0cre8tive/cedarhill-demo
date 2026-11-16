/**
 * Which Kingdom Kit package this site is.
 *
 *   KIT_PACKAGE=chapel | sanctuary | cathedral
 *
 * Cathedral turns on Team Communication (team announcements, team spaces, comments on
 * records, notifications and the weekly rundown). On Chapel and Sanctuary none of it shows
 * and none of it can be reached. Leave the setting empty and the site is Cathedral.
 */
export type KitPackage = 'chapel' | 'sanctuary' | 'cathedral'

export function kitPackage(): KitPackage {
  const v = String(process.env.KIT_PACKAGE ?? '').trim().toLowerCase()
  return v === 'chapel' || v === 'sanctuary' ? v : 'cathedral'
}

/** Team Communication is a Cathedral feature. */
export const teamCommOn = () => kitPackage() === 'cathedral'
