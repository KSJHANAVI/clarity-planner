import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { TIME_OPTIONS, QUADRANTS } from '../../utils/quadrants'
import { formatDeadline } from '../../utils/date'
import s from './AddMoreModal.module.css'

const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), text: '', deadline: '', timeEstimate: '' })

export default function AddMoreModal({ onConfirm, onClose }) {
  const tasks   = useStore((st) => st.tasks)
  const active  = tasks.filter((t) => !t.completed_at && !t.deleted_at)
  const [rows, setRows]           = useState([EMPTY_ROW()])
  const [deletedIds, setDeletedIds] = useState(new Set())

  const updateRow = (id, field, val) =>
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, [field]: val } : r))

  const addRow = () => setRows((rs) => [...rs, EMPTY_ROW()])

  const removeNewRow = (id) =>
    setRows((rs) => rs.length > 1 ? rs.filter((r) => r.id !== id) : rs)

  const toggleDelete = (taskId) =>
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })

  const handleConfirm = () => {
    // Pass deleted IDs up + new rows
    onConfirm(rows, [...deletedIds])
  }

  const hasNew = rows.some((r) => r.text.trim())

  return (
    <Modal title="Add more tasks" onClose={onClose} wide>

      {/* Existing tasks with delete option */}
      {active.length > 0 && (
        <div className={s.section}>
          <p className={s.sectionLabel}>Current tasks — mark to remove</p>
          <div className={s.existingList}>
            {active.map((task) => {
              const marked = deletedIds.has(task.id)
              const q = QUADRANTS[task.quadrant]
              return (
                <div key={task.id} className={[s.existingRow, marked ? s.markedDelete : ''].join(' ')}>
                  <div className={s.existingMeta}>
                    <span className={s.qBadge} style={{ color: `var(--${task.quadrant}-ink)`, background: `var(--${task.quadrant}-bg)` }}>
                      {q?.emoji} {q?.label}
                    </span>
                    <span className={s.existingText}>{task.text}</span>
                    {task.deadline && (
                      <span className={s.existingDeadline}>{formatDeadline(task.deadline)}</span>
                    )}
                  </div>
                  <button
                    className={[s.trashBtn, marked ? s.trashActive : ''].join(' ')}
                    onClick={() => toggleDelete(task.id)}
                    title={marked ? 'Keep task' : 'Remove task'}
                  >
                    {marked ? <UndoIcon /> : <TrashIcon />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New task rows */}
      <div className={s.section}>
        <p className={s.sectionLabel}>New tasks</p>
        <div className={s.colHeaders}>
          <span>Task</span>
          <span>By when?</span>
          <span>How long?</span>
          <span />
        </div>
        {rows.map((row, idx) => (
          <div key={row.id} className={s.newRow}>
            <input
              className={s.taskInput}
              value={row.text}
              onChange={(e) => updateRow(row.id, 'text', e.target.value)}
              placeholder={`New task ${idx + 1}…`}
              onKeyDown={(e) => e.key === 'Enter' && addRow()}
              autoFocus={idx === 0}
            />
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
            <button className={s.removeBtn} onClick={() => removeNewRow(row.id)} title="Remove">
              <TrashIcon />
            </button>
          </div>
        ))}
        <button className={s.addRowBtn} onClick={addRow}>+ Another task</button>
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary" size="sm"
          onClick={handleConfirm}
          disabled={!hasNew && deletedIds.size === 0}
        >
          Sort my day again ✦
        </Button>
      </div>
    </Modal>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,3 13,3"/><path d="M5,3V2h4v1"/><path d="M2,3l1,9h8l1-9"/>
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2,6 C2,3.8 3.8,2 6,2 C8.2,2 10,3.8 10,6 C10,8.2 8.2,10 6,10"/>
      <polyline points="2,3 2,6 5,6"/>
    </svg>
  )
}
