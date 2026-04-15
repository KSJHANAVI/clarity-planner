import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { sortTasksForDay } from '../../services/aiService'
import { getEnergy, consumeEnergy, insertTasks, getRecentPatterns, getTasksForDate, updateTask } from '../../services/dbService'
import AppHeader from '../../components/layout/AppHeader'
import Button from '../../components/ui/Button'
import { TIME_OPTIONS } from '../../utils/quadrants'
import { todayISO, greeting, countdownToMidnight } from '../../utils/date'
import s from './BrainDumpScreen.module.css'

const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), text: '', deadline: '', timeEstimate: '' })

export default function BrainDumpScreen() {
  const session          = useStore((st) => st.session)
  const profile          = useStore((st) => st.profile)
  const goals            = useStore((st) => st.goals)
  const energy           = useStore((st) => st.energy)
  const setEnergy        = useStore((st) => st.setEnergy)
  const setTasks         = useStore((st) => st.setTasks)
  const setPhase         = useStore((st) => st.setPhase)
  const showNotification = useStore((st) => st.showNotification)

  const [rows, setRows]           = useState([EMPTY_ROW()])
  const [sorting, setSorting]     = useState(false)
  const [energyEmpty, setEnergyEmpty] = useState(false)
  const [duplicateRowId, setDuplicateRowId] = useState(null)

  const sortsLeft = energy ? Math.max(0, energy.sorts_limit - energy.sorts_used) : 5

  // Load energy on mount
  useEffect(() => {
    if (session?.user) {
      getEnergy(session.user.uid).then(setEnergy).catch(console.error)
    }
  }, [session])

  // Auto-redirect to matrix only on fresh load (not when user clicks ← Brain dump)
  useEffect(() => {
    if (!session?.user) return
    const existingStoreTasks = useStore.getState().tasks.filter((t) => !t.deleted_at && !t.completed_at)

    if (existingStoreTasks.length > 0) {
      setRows(existingStoreTasks.map((t) => ({
        id: t.id,
        text: t.text,
        deadline: t.deadline || '',
        timeEstimate: t.time_estimate || '',
      })))
      return
    }

    getTasksForDate(session.user.uid, todayISO()).then((existing) => {
      if (existing.length > 0) {
        setTasks(existing)
        setPhase('matrix')
      }
    }).catch(console.error)
  }, [session])

  const updateRow = (id, field, val) => {
    setRows((rs) => {
      const updated = rs.map((r) => r.id === id ? { ...r, [field]: val } : r)
      if (field === 'text') {
        const texts = updated.map((r) => r.text.trim().toLowerCase()).filter(Boolean)
        const hasDup = texts.some((t, i) => texts.indexOf(t) !== i)
        setDuplicateRowId(hasDup ? id : null)
      }
      return updated
    })
  }

  const addRow = () => setRows((rs) => [...rs, EMPTY_ROW()])

  const removeRow = (id) => {
    setRows((rs) => rs.length > 1 ? rs.filter((r) => r.id !== id) : rs)
    if (duplicateRowId === id) setDuplicateRowId(null)
  }

  const handleSort = async () => {
    const validRows = rows.filter((r) => r.text.trim())
    if (validRows.length === 0) {
      showNotification('Add at least one task first.', 'error'); return
    }

    // Double-check duplicates before sorting
    const rowTexts = validRows.map((r) => r.text.trim().toLowerCase())
    const hasDuplicateRows = rowTexts.some((t, i) => rowTexts.indexOf(t) !== i)
    if (hasDuplicateRows) {
      showNotification('You have duplicate tasks. Please remove them before sorting.', 'error')
      return
    }

    if (sortsLeft <= 0) { setEnergyEmpty(true); return }

    setSorting(true)
    try {
      const updatedEnergy = await consumeEnergy(session.user.uid)
      setEnergy(updatedEnergy)

      const patterns = await getRecentPatterns(session.user.uid)
      const { tasks: results, warning } = await sortTasksForDay(validRows, profile, goals, patterns)

      if (warning) showNotification(warning, 'error')

      const today = todayISO()

      const existingToday = await getTasksForDate(session.user.uid, today)
      const existingTexts = new Set(existingToday.map((t) => t.text.trim().toLowerCase()))

      const rowsToInsert = []
      const rowsToUpdate = []

      validRows.forEach((row, i) => {
        const result = results.find((r) => r.index === i + 1) ?? { quadrant: 'q2', priority: i + 1, goal_tag: 'General' }
        const isExisting = existingTexts.has(row.text.trim().toLowerCase())
        const existingTask = existingToday.find((t) => t.text.trim().toLowerCase() === row.text.trim().toLowerCase())

        if (isExisting && existingTask) {
          rowsToUpdate.push({ task: existingTask, result })
        } else {
          rowsToInsert.push({
            user_id:       session.user.uid,
            text:          row.text.trim(),
            deadline:      row.deadline || null,
            time_estimate: row.timeEstimate || null,
            quadrant:      result.quadrant,
            priority:      result.priority,
            goal_tag:      result.goal_tag,
            reasoning:     result.reasoning,
            session_date:  today,
            completed_at:  null,
            deleted_at:    null,
          })
        }
      })

      for (const { task, result } of rowsToUpdate) {
        await updateTask(task.id, {
          quadrant: result.quadrant,
          priority: result.priority,
          goal_tag: result.goal_tag,
        }, session.user.uid, today)
      }

      const inserted = rowsToInsert.length > 0 ? await insertTasks(rowsToInsert) : []

      const updatedExisting = await getTasksForDate(session.user.uid, today)
      setTasks([...updatedExisting, ...inserted.filter(
        (t) => !updatedExisting.find((e) => e.id === t.id)
      )])

      setPhase('matrix')
    } catch (e) {
      if (e.message === 'ENERGY_EMPTY') {
        setEnergyEmpty(true)
      } else {
        console.error('[BrainDump] sort failed:', e)
        showNotification('Something went wrong. Try again.', 'error')
      }
    } finally {
      setSorting(false)
    }
  }

  // Live overload warning — no AI needed
  const timeToHours = (est) => {
    if (est === '15 min') return 0.25
    if (est === '30 min') return 0.5
    if (est === '1 hr')   return 1
    if (est === '2 hr+')  return 2.5
    return 0
  }

  const totalEstimatedHours = rows.reduce((sum, r) => sum + timeToHours(r.timeEstimate), 0)

  const earliestDeadline = rows
    .filter((r) => r.deadline)
    .map((r) => new Date(r.deadline))
    .sort((a, b) => a - b)[0]

  const hoursToEarliestDeadline = earliestDeadline
    ? Math.round((earliestDeadline - new Date()) / 36e5)
    : null

  const liveOverloadWarning =
    hoursToEarliestDeadline !== null && totalEstimatedHours > hoursToEarliestDeadline
      ? `⚠️ You have ${totalEstimatedHours}h of work but your earliest deadline is in ${hoursToEarliestDeadline}h. Something has to give.`
      : null

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.main}>
        <div className={s.greet}>
          <h1 className={s.greetText}>{greeting(profile?.name)}</h1>
          <p className={s.greetSub}>What's on your mind today? Dump it all — Clarity will sort it.</p>
        </div>

        <div className={s.rowsWrap}>
          <div className={s.colHeaders}>
            <span className={s.colTask}>Task</span>
            <span className={s.colDeadline}>By when?</span>
            <span className={s.colTime}>How long?</span>
            <span className={s.colDel} />
          </div>

          {rows.map((row, idx) => {
            const isDup = duplicateRowId !== null &&
              rows.some((r) => r.id !== row.id && r.text.trim().toLowerCase() === row.text.trim().toLowerCase() && row.text.trim() !== '')
            return (
              <div key={row.id} className={[s.row, isDup ? s.rowDup : ''].join(' ')}>
                <div className={s.taskInputWrap}>
                  <input
                    className={s.taskInput}
                    value={row.text}
                    onChange={(e) => updateRow(row.id, 'text', e.target.value)}
                    placeholder={`Task ${idx + 1}…`}
                    onKeyDown={(e) => e.key === 'Enter' && addRow()}
                    autoFocus={idx === 0}
                  />
                  {isDup && (
                    <span className={s.dupInline}>duplicate task</span>
                  )}
                </div>
                <input
                  className={s.dateInput}
                  type="datetime-local"
                  value={row.deadline}
                  onChange={(e) => updateRow(row.id, 'deadline', e.target.value)}
                />
                <select
                  className={s.timeSelect}
                  value={row.timeEstimate}
                  onChange={(e) => updateRow(row.id, 'timeEstimate', e.target.value)}
                >
                  <option value="">— time —</option>
                  {TIME_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  className={s.deleteBtn}
                  onClick={() => removeRow(row.id)}
                  title="Remove this task"
                >
                  <TrashIcon />
                </button>
              </div>
            )
          })}

          <button className={s.addRowBtn} onClick={addRow}>+ Add another task</button>
        </div>

        {energyEmpty && (
          <div className={s.energyWall}>
            <p className={s.energyTitle}>You're out of sorts for today.</p>
            <p className={s.energySub}>Resets in {countdownToMidnight()} · or upgrade to Pro for 50/day</p>
            <div className={s.energyActions}>
              <Button variant="primary" size="sm" onClick={() => showNotification('Upgrade coming soon!', 'default')}>
                Upgrade to Pro
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEnergyEmpty(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {duplicateRowId && (
          <div className={s.dupWarning}>
            A task with this title already exists in your list. Please rename or remove the duplicate.
          </div>
        )}

        {liveOverloadWarning && (
          <div className={s.liveWarning}>
            {liveOverloadWarning}
          </div>
        )}

        {!energyEmpty && (
          <div className={s.sortWrap}>
            <Button
              variant="primary" size="lg"
              onClick={handleSort}
              loading={sorting}
              disabled={!!duplicateRowId}
              className={s.sortBtn}
            >
              {sorting ? 'Sorting your day…' : 'Sort my day ✦'}
            </Button>
            <p className={s.sortHint}>
              {sortsLeft} sort{sortsLeft !== 1 ? 's' : ''} remaining today
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,3 13,3"/><path d="M5,3V2h4v1"/><path d="M2,3l1,9h8l1-9"/>
    </svg>
  )
}