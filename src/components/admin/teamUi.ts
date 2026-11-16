/** Small helpers shared by the Team Communication screens. */

export const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(pastor|pastors|dr\.?|rev\.?)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '•'

export const TYPE_LABEL: Record<string, string> = {
  mention: 'Mention',
  reply: 'Reply',
  announcement: 'Announcement',
  reminder: 'Reminder',
}

export async function api<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } : init?.headers,
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: Array<{ message?: string }>; message?: string }
  if (!res.ok) throw new Error(body.error || body.errors?.[0]?.message || body.message || `Something went wrong (${res.status}).`)
  return body as T
}
