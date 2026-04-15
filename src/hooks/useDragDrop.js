import { useRef, useState } from 'react'

export function useDragDrop(onDrop) {
  const draggedId = useRef(null)
  const [overQuadrant, setOverQuadrant] = useState(null)

  const taskDragHandlers = (taskId) => ({
    draggable: true,
    onDragStart: (e) => {
      draggedId.current = taskId
      e.dataTransfer.setData('text/plain', taskId)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => { draggedId.current = null },
  })

  const quadrantDropHandlers = (quadrantId) => ({
    onDragOver:  (e) => { e.preventDefault(); setOverQuadrant(quadrantId) },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverQuadrant(null) },
    onDrop: (e) => {
      e.preventDefault()
      setOverQuadrant(null)
      if (draggedId.current) { onDrop(draggedId.current, quadrantId); draggedId.current = null }
    },
  })

  return { taskDragHandlers, quadrantDropHandlers, overQuadrant }
}
