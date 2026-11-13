// "now", "5m", "3h", "2d", then "Nov 3" (adds the year when it isn't this one).
export function timeAgo(iso) {
  const then = new Date(iso)
  const secs = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000))
  if (secs < 10) return 'now'
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const opts = { month: 'short', day: 'numeric' }
  if (then.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return then.toLocaleDateString(undefined, opts)
}

export const fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const joinedDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

// 1200 -> "1.2K"
export function compact(n) {
  if (n < 1000) return String(n)
  if (n < 1e6) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'K'
  return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
}

// Stable pastel hue (0-359) from a string, for generated avatars.
export function hueFor(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}
