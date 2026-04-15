import React from 'react'
import s from './Button.module.css'

export default function Button({
  children, variant = 'default', size = 'md',
  onClick, disabled, type = 'button', className = '', loading, ...rest
}) {
  return (
    <button
      type={type}
      className={[s.btn, s[variant], s[size], loading ? s.loading : '', className].join(' ')}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={s.spinner} /> : null}
      {children}
    </button>
  )
}
