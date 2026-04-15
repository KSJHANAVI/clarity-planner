import React, { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import {
  updateTask as dbUpdateTask,
  softDeleteTask,
  completeTask as dbComplete,
  uncompleteTask,
  logRearrangement,
  getEnergy,
  consumeEnergy,
  getRecentPatterns,
  insertTasks,
  calculateAndSaveXP,
} from '../../services/dbService'
import { sortTasksForDay, getCelebrationQuote } from '../../services/aiService'
import { useDragDrop } from '../../hooks/useDragDrop'
import { QUADRANT_LIST } from '../../utils/quadrants'
import { todayISO, countdownToMidnight } from '../../utils/date'
import AppHeader from '../../components/layout/AppHeader'
import Quadrant from './Quadrant'
import AddMoreModal from './AddMoreModal'
import Button from '../../components/ui/Button'
import s from './MatrixView.module.css'

export default function MatrixView() {
  const session          = useStore((st) => st.session)
  const profile          = useStore((st) => st.profile)
  const goals            = useStore((st) => st.goals)
  const tasks            = useStore((st) => st.tasks)
  const energy           = useStore((st) => st.energy)
  const setEnergy        = useStore((st) => st.setEnergy)
  const updateTask       = useStore((st) => st.updateTask)
  const removeTask       = useStore((st) => st.removeTask)
  const addTasks         = useStore((st) => st.addTasks)
  const allDone          = useStore((st) => st.allActiveTasksDone())
  const ui               = useStore((st) => st.ui)
  const setUI            = useStore((st) => st.setUI)
  const setPhase         = useStore((st) => st.setPhase)
  const showNotification = useStore((st) => st.showNotification)
  const celebrationShown = useStore((st) => st.ui.celebrationShown)

  const userId = session?.user?.uid
  const today  = todayISO()

  useEffect(() => {
    if (allDone && tasks.filter((t) => !t.deleted_at).length > 0 && !celebrationShown) {
      setUI({ celebrationShown: true })
      triggerCelebration()
    }
  }, [allDone])

  const triggerCelebration = async () => {
    try {
      const xpResult = await calculateAndSaveXP(userId, tasks, today)
      const quote    = await getCelebrationQuote(profile, goals)
      setUI({
        celebrationQuote: quote,
        celebrationXP:    xpResult,
      })
    } catch (e) {
      console.error('[Matrix] celebration failed:', e)
      setUI({ celebrationQuote: null, celebrationXP: null })
    }
    setPhase('celebration')
  }

  const handleDrop = async (taskId, toQuadrant) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.quadrant === toQuadrant) return
    const fromQuadrant = task.quadrant
    updateTask(taskId, { quadrant: toQuadrant })
    try {
      await dbUpdateTask(taskId, { quadrant: toQuadrant }, userId, today)
      await logRearrangement(userId, taskId, task.text, fromQuadrant, toQuadrant)
      showNotification('Task moved ✓', 'success')
    } catch {
      updateTask(taskId, { quadrant: fromQuadrant })
      showNotification('Failed to move task.', 'error')
    }
  }

  const { taskDragHandlers, quadrantDropHandlers, overQuadrant } = useDragDrop(handleDrop)

  const handleComplete = async (taskId, currentlyDone) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const taskDate = task.session_date || today
    if (currentlyDone) {
      updateTask(taskId, { completed_at: null })
      await uncompleteTask(taskId, userId, taskDate)
    } else {
      updateTask(taskId, { completed_at: new Date().toISOString() })
      await dbComplete(taskId, userId, taskDate)
      showNotification('Task done ✦', 'success')
    }
  }

  const handleDelete = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const taskDate = task.session_date || today
    removeTask(taskId)
    await softDeleteTask(taskId, userId, taskDate).catch(console.error)
    showNotification('Task removed.', 'default')
  }

  const handleAddMore = async (newRows, deletedIds = []) => {
    for (const id of deletedIds) {
      const task = tasks.find((t) => t.id === id)
      removeTask(id)
      if (task) await softDeleteTask(id, userId, task.session_date || today).catch(console.error)
    }

    const sortsLeft = energy ? Math.max(0, energy.sorts_limit - energy.sorts_used) : 0
    if (sortsLeft <= 0) { showNotification('No sorts left today.', 'error'); return }

    setUI({ addMoreModalOpen: false })
    showNotification('Re-sorting your day…', 'default')

    try {
      const updatedEnergy  = await consumeEnergy(userId)
      setEnergy(updatedEnergy)

      const activeTasks    = tasks.filter((t) => !t.completed_at && !t.deleted_at && !deletedIds.includes(t.id))
      const allTasksForSort = [
        ...activeTasks.map((t) => ({ text: t.text, deadline: t.deadline, time_estimate: t.time_estimate })),
        ...newRows.filter((r) => r.text.trim()),
      ]

      const patterns = await getRecentPatterns(userId)
      const results  = await sortTasksForDay(allTasksForSort, profile, goals, patterns)

      for (let i = 0; i < activeTasks.length; i++) {
        const r = results[i]
        if (!r) continue
        const t = activeTasks[i]
        updateTask(t.id, { quadrant: r.quadrant, priority: r.priority })
        await dbUpdateTask(t.id, { quadrant: r.quadrant, priority: r.priority }, userId, t.session_date || today)
      }

      const newTasksToInsert = newRows
        .filter((r) => r.text.trim())
        .map((row, j) => {
          const r = results[activeTasks.length + j]
          return {
            user_id:       userId,
            text:          row.text.trim(),
            deadline:      row.deadline || null,
            time_estimate: row.timeEstimate || null,
            quadrant:      r?.quadrant ?? 'q2',
            priority:      r?.priority ?? j + 1,
            goal_tag:      r?.goal_tag ?? 'General',
            session_date:  today,
            completed_at:  null,
            deleted_at:    null,
          }
        })

      if (newTasksToInsert.length > 0) {
        const saved = await insertTasks(newTasksToInsert)
        addTasks(saved)
      }

      showNotification('Day re-sorted ✦', 'success')
    } catch (e) {
      console.error('[Matrix] addMore failed:', e)
      showNotification('Something went wrong.', 'error')
    }
  }

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.main}>
        <div className={s.axisRow}>
          <div className={s.corner} />
          <div className={s.axisLabel}>Urgent</div>
          <div className={s.axisLabel}>Not Urgent</div>
        </div>
        <div className={s.body}>
          <div className={s.yLabels}>
            <div className={s.yLabel}>Important</div>
            <div className={s.yLabel}>Not Important</div>
          </div>
          <div className={s.grid}>
            {QUADRANT_LIST.map((q) => (
              <Quadrant
                key={q.id}
                quadrant={q}
                dropHandlers={quadrantDropHandlers(q.id)}
                taskDragHandlers={taskDragHandlers}
                isOver={overQuadrant === q.id}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
        <div className={s.addMoreWrap}>
          <Button variant="default" size="md" onClick={() => setUI({ addMoreModalOpen: true })}>
            + Add more tasks
          </Button>
          <p className={s.addMoreHint}>
            Costs 1 sort · {energy ? Math.max(0, energy.sorts_limit - energy.sorts_used) : '—'} remaining
          </p>
        </div>
      </main>
      {ui.addMoreModalOpen && (
        <AddMoreModal onConfirm={handleAddMore} onClose={() => setUI({ addMoreModalOpen: false })} />
      )}
    </div>
  )
}