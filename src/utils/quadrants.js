export const QUADRANTS = {
  q1: { id:'q1', label:'Do First',  subtitle:'Urgent + Important',        emoji:'🔥', xpMultiplier:3 },
  q2: { id:'q2', label:'Schedule',  subtitle:'Important, Not Urgent',     emoji:'🌱', xpMultiplier:2 },
  q3: { id:'q3', label:'Delegate',  subtitle:'Urgent, Not Important',     emoji:'↗',  xpMultiplier:1 },
  q4: { id:'q4', label:'Eliminate', subtitle:'Not Urgent · Not Important', emoji:'✕',  xpMultiplier:0 },
}
export const QUADRANT_LIST = Object.values(QUADRANTS)

export const TIME_OPTIONS = ['15 min','30 min','1 hr','2 hr+','ongoing']

export const PRIORITY_COLORS = {
  1:'var(--priority-1)', 2:'var(--priority-2)',
  3:'var(--priority-3)', 4:'var(--priority-4)',
}

export const CELEBRATION_QUOTES = [
  "The day is done and it was done well.",
  "Stillness now. You've earned it.",
  "Every checked box was a choice. You chose well.",
]
