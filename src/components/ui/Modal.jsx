import React, { useEffect } from 'react'
import s from './Modal.module.css'

export default function Modal({ children, onClose, title, wide }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className={s.overlay} onClick={onClose}>
      <div
        className={[s.modal, wide ? s.wide : ''].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={s.header}>
            <h3 className={s.title}>{title}</h3>
            <button className={s.close} onClick={onClose}>✕</button>
          </div>
        )}
        <div className={s.body}>{children}</div>
      </div>
    </div>
  )
}
