import React from 'react'
import { PRIORITY_COLORS } from '../../utils/quadrants'
import { formatDeadline } from '../../utils/date'
import s from './TaskCard.module.css'

export default function TaskCard({ task, dragHandlers, onComplete, onDelete, done }) {
  const deadline = formatDeadline(task.deadline)

  return (
    <div
      className={[s.card, done ? s.done : ''].join(' ')}
      {...(done ? {} : dragHandlers)}
    >
      {/* Priority dot */}
      {!done && (
        <div className={s.dot} style={{ background: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS[4] }} />
      )}

      {/* Checkbox */}
      <button
        className={[s.checkbox, done ? s.checked : ''].join(' ')}
        onClick={() => onComplete(task.id, !!task.completed_at)}
        title={done ? 'Mark undone' : 'Mark done'}
      >
        {done && <CheckIcon />}
      </button>

      {/* Body */}
      <div className={s.body}>
        <p className={s.text}>{task.text}</p>
        <div className={s.tags}>
          {task.goal_tag && <span className={s.tagGoal}>{task.goal_tag}</span>}
          {task.time_estimate && <span className={s.tagTime}>{task.time_estimate}</span>}
          {deadline && (
            <span className={[s.tagDeadline, deadline === 'overdue' ? s.overdue : ''].join(' ')}>
              {deadline}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        className={s.deleteBtn}
        onClick={() => onDelete(task.id)}
        title="Delete task"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1.5,5 4,7.5 8.5,2.5"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,3 13,3"/><path d="M5,3V2h4v1"/><path d="M2,3l1,9h8l1-9"/>
    </svg>
  )
}
