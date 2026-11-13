/** Shared by the dashboard (browser) and the server. */
/** The follow-up pipeline, in order. */
export const STAGES = [
  { value: 'new-guest', label: 'New guest' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'second-visit', label: 'Second visit' },
  { value: 'connected', label: 'Connected' },
  { value: 'member', label: 'Member' },
] as const
export type Stage = (typeof STAGES)[number]['value']
export const stageLabel = (v?: string | null) => STAGES.find((s) => s.value === v)?.label ?? 'New guest'

export const SOURCES = [
  { value: 'visit', label: 'Plan a Visit form' },
  { value: 'member', label: 'New Member form' },
  { value: 'salvation', label: 'Salvation form' },
  { value: 'connect', label: 'Stay connected pop-up' },
  { value: 'card', label: 'Connect card' },
  { value: 'serve', label: 'Serve sign-up' },
  { value: 'event', label: 'Event' },
  { value: 'in-person', label: 'Met in person' },
  { value: 'other', label: 'Other' },
] as const
