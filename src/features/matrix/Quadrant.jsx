import React from 'react'
import { useStore } from '../../store/useStore'
import TaskCard from './TaskCard'
import s from './Quadrant.module.css'

export default function Quadrant({ quadrant, dropHandlers, taskDragHandlers, isOver, onComplete, onDelete }) {
  const tasks = useStore((st) => st.getTasksByQuadrant(quadrant.id))
  const { id, label, subtitle, emoji } = quadrant
  const active     = tasks.filter((t) => !t.completed_at)
  const completed  = tasks.filter((t) =>  t.completed_at)

  return (
    <div
      className={[s.quadrant, s[id], isOver ? s.over : ''].join(' ')}
      {...dropHandlers}
    >
      <div className={s.header}>
        <div className={s.icon}>{emoji}</div>
        <div className={s.meta}>
          <div className={s.title}>{label}</div>
          <div className={s.subtitle}>{subtitle}</div>
        </div>
        <div className={s.count}>{active.length}</div>
      </div>

      <div className={s.list}>
        {active.length === 0 && completed.length === 0 && (
          <div className={s.empty}>Drop tasks here</div>
        )}
        {active.map((task) => (
          <TaskCard key={task.id} task={task}
            dragHandlers={taskDragHandlers(task.id)}
            onComplete={onComplete} onDelete={onDelete} />
        ))}
        {completed.map((task) => (
          <TaskCard key={task.id} task={task} done
            dragHandlers={taskDragHandlers(task.id)}
            onComplete={onComplete} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}
