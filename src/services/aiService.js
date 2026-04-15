/**
 * CLARITY AI SERVICE — v2
 * All Claude calls live here. Swap model or provider by editing this file only.
 */

const MODEL   = 'claude-sonnet-4-20250514'
const API_URL = '/api/claude'

async function callClaude(prompt, maxTokens = 1200) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = data.content.map((b) => b.text || '').join('')
  return raw.replace(/```json|```/g, '').trim()
}

// ── Build reusable goal context block ─────────────────────────────────────
function goalContext(profile, goals, patterns = []) {
  return `
USER PROFILE:
Name: ${profile.name}
Focus area: ${profile.focus_area || 'not specified'}

GOALS:
Monthly: ${goals.monthly_primary || '—'}
  Success looks like: ${goals.monthly_success || '—'}
Annual: ${goals.annual_primary || '—'}
  Fears not achieving: ${goals.annual_fear || '—'}
3-year vision: ${goals.three_year_vision || '—'}
  Ideal daily life: ${goals.three_year_daily_life || '—'}

${patterns.length > 0 ? `PERSONAL PATTERNS (from past rearrangements):
${patterns.map(p => `- "${p.text}" → user tends to move to ${p.to_quadrant}`).join('\n')}` : ''}

${profile.work_role ? `WORK CONTEXT:
Role: ${profile.work_role}
Current projects: ${profile.work_projects || '—'}
Regular colleagues: ${profile.work_colleagues || '—'}` : ''}

${profile.five_people ? `FIVE PRIORITY PEOPLE:
${profile.five_people}
Any task involving these people should be treated as personally important (P1/P2).
These are NOT external asks — they are the user's chosen inner circle.` : ''}
`.trim()
}

// ── Onboarding: infer gender + generate starter tasks ─────────────────────
export async function processOnboarding(profile, goals) {
  const prompt = `${goalContext(profile, goals)}

TASKS:
1. Infer the user's gender from their name ("${profile.name}").
   Return "female", "male", or "neutral" — never ask, never assume from stereotypes,
   default to "neutral" if genuinely ambiguous (e.g. Alex, Jordan, Sam).

2. Write a single-paragraph goal_summary (max 60 words) distilling their core
   ambition across all three time horizons. This will be used as context in
   every future Claude call — make it dense and specific.

3. Generate 5 starter tasks highly specific to their stated goals.
   Each task should move them meaningfully toward their vision.

Respond ONLY with valid JSON, no markdown:
{
  "gender": "female" | "male" | "neutral",
  "goal_summary": "...",
  "suggested_tasks": [
    {
      "text": "specific actionable task",
      "deadline": null,
      "time_estimate": "30 min" | "1 hr" | "2 hr+" | "ongoing",
      "quadrant": "q1" | "q2" | "q3" | "q4",
      "priority": 1 | 2 | 3 | 4
    }
  ]
}`

  try {
    const raw = await callClaude(prompt, 1000)
    return JSON.parse(raw)
  } catch (e) {
    console.error('[AI] processOnboarding failed:', e)
    return {
      gender: 'neutral',
      goal_summary: `${profile.name} is focused on ${profile.focus_area || 'personal growth'}.`,
      suggested_tasks: [],
    }
  }
}

// ── Daily sort: classify all tasks comparatively ───────────────────────────
export async function sortTasksForDay(tasks, profile, goals, patterns = []) {
  const now = new Date()

  // Pre-compute deadline urgency and total workload
  const timeEstimateToHours = (est) => {
    if (!est) return 0
    if (est === '15 min') return 0.25
    if (est === '30 min') return 0.5
    if (est === '1 hr')   return 1
    if (est === '2 hr+')  return 2.5
    return 0
  }

  const totalHours = tasks.reduce((sum, t) => sum + timeEstimateToHours(t.time_estimate), 0)
  const hoursLeftToday = (new Date().setHours(23, 59, 0, 0) - now) / 36e5
  const overloaded = totalHours > hoursLeftToday

  const taskList = tasks
    .map((t, i) => {
      let deadlineNote = 'no deadline'
      if (t.deadline) {
        const hoursUntil = Math.round((new Date(t.deadline) - now) / 36e5)
        if (hoursUntil <= 0)       deadlineNote = 'OVERDUE'
        else if (hoursUntil <= 2)  deadlineNote = `deadline in ${hoursUntil}h — CRITICAL`
        else if (hoursUntil <= 6)  deadlineNote = `deadline in ${hoursUntil}h — urgent today`
        else if (hoursUntil <= 24) deadlineNote = `deadline in ${hoursUntil}h — due today`
        else                       deadlineNote = `deadline in ${hoursUntil}h`
      }
      const time = t.time_estimate ? `est. ${t.time_estimate}` : ''
      return `${i + 1}. "${t.text}" (${[deadlineNote, time].filter(Boolean).join(', ')})`
    })
    .join('\n')

  const overloadWarning = overloaded
    ? `⚠️ OVERLOAD WARNING: Total estimated work is ${totalHours.toFixed(1)} hours but only ${hoursLeftToday.toFixed(1)} hours remain today. The user cannot do all of this. Be aggressive about pushing non-urgent tasks to Q4 or Q3.`
    : ''

  const prompt = `${goalContext(profile, goals, patterns)}

GOAL SUMMARY: ${goals.goal_summary || ''}

PRIORITY BIAS — rank tasks using this life category hierarchy:
1. GOALS (highest) — tasks directly advancing the user's stated monthly, annual or 3-year goals
2. WORK — professional tasks, client obligations, deliverables
3. DAILY ESSENTIALS — meals, health, exercise, errands (dinner, groceries etc.)
4. FAMILY — family commitments and responsibilities  
5. SOCIAL / EXTERNAL ASKS — tasks requested by others that don't advance the user's own goals (e.g. "Pradeep's task", "DB Stories" unless they are core work deliverables)

Apply this hierarchy WITHIN quadrants when deciding priority order.
A goal-aligned task always outranks an external ask even if both are urgent.
"DB Stories" and tasks named after other people should be treated as external obligations unless the user's goals explicitly mention them.
Work tasks that ARE goal-aligned (e.g. system design if the user's goal is system design mastery) should be treated as category 1, not category 2.

CURRENT TIME: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
${overloadWarning}

TODAY'S TASKS — classify these RELATIVE TO EACH OTHER.
Deadline proximity is the strongest urgency signal — weight it heavily.

${taskList}

CLASSIFICATION RULES:
- Q1 (Do First): deadline within 6 hours OR overdue OR blocks everything else. Be strict — max 3 tasks.
- Q2 (Schedule): important, deadline later than 6hrs away or no deadline. Growth, strategy, learning.
- Q3 (Delegate): urgent but genuinely not important — admin, interruptions, someone else could do it.
- Q4 (Eliminate): neither urgent nor important. Low value, time wasters, can wait indefinitely.
- If overload warning is present, be aggressive: push tasks with no deadline and low goal alignment to Q3/Q4.
- priority 1 = most important within that quadrant. No two tasks in the same quadrant share a priority.

Also return a "warning" field at the top level if the user is overloaded.

Respond ONLY with valid JSON, no markdown:
{
  "tasks": [
    {
      "index": 1,
      "quadrant": "q1" | "q2" | "q3" | "q4",
      "priority": 1 | 2 | 3 | 4,
      "goal_tag": "max 3 words",
      "reasoning": "one sentence why"
    }
  ],
  "warning": null | "You have X hours of work but only Y hours left today. Something has to give."
}`

  try {
    const raw  = await callClaude(prompt, 1400)
    const parsed = JSON.parse(raw)
    // Support both old array format and new object format
    const taskResults = Array.isArray(parsed) ? parsed : parsed.tasks
    return { tasks: taskResults, warning: parsed.warning ?? null }
  } catch (e) {
    console.error('[AI] sortTasksForDay failed:', e)
    return {
      tasks: tasks.map((_, i) => ({
        index: i + 1, quadrant: 'q2', priority: i + 1,
        goal_tag: 'General', reasoning: 'Default classification',
      })),
      warning: null,
    }
  }
}

// ── Celebration quote personalised to goals ────────────────────────────────
export async function getCelebrationQuote(profile, goals) {
  const prompt = `The user "${profile.name}" just completed every single task on their Eisenhower matrix for the day.

Their 3-year vision: ${goals.three_year_vision || 'a better future'}

Write ONE short, warm, deeply personal celebration message (2-3 sentences max).
Reference their actual vision subtly. Make them feel genuinely seen, not generically praised.
No clichés. No "great job!". Make it feel like it came from a wise friend who knows them.

Respond with ONLY the message text, no JSON, no quotes.`

  try {
    return await callClaude(prompt, 200)
  } catch (e) {
    return `Every task done. That's not nothing — that's a day that moved you forward. Rest well.`
  }
}
