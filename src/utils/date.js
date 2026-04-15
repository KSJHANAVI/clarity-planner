export const todayISO = () => new Date().toISOString().split('T')[0]

export const greeting = (name) => {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${time}${name ? `, ${name}` : ''}.`
}

export const msUntilMidnight = () => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight - now
}

export const countdownToMidnight = () => {
  const ms = msUntilMidnight()
  const h = Math.floor(ms / 36e5)
  const m = Math.floor((ms % 36e5) / 6e4)
  return `${h}h ${m}m`
}

export const formatDeadline = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return 'overdue'
  if (diff < 864e5) return 'today'
  if (diff < 2 * 864e5) return 'tomorrow'
  return d.toLocaleDateString('en', { month:'short', day:'numeric' })
}
