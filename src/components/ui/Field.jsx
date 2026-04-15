import React from 'react'
import s from './Field.module.css'

export function Field({ label, hint, children, error }) {
  return (
    <div className={s.group}>
      {label && <label className={s.label}>{label}</label>}
      {hint  && <span  className={s.hint}>{hint}</span>}
      {children}
      {error && <span className={s.error}>{error}</span>}
    </div>
  )
}

export function Input({ value, onChange, placeholder, autoFocus, type = 'text', ...rest }) {
  return (
    <input
      className={s.input} type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus} {...rest}
    />
  )
}

export function Textarea({ value, onChange, placeholder, rows = 4, ...rest }) {
  return (
    <textarea
      className={s.textarea} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows} {...rest}
    />
  )
}

export function Select({ value, onChange, children, ...rest }) {
  return (
    <select
      className={s.select} value={value}
      onChange={(e) => onChange(e.target.value)} {...rest}
    >
      {children}
    </select>
  )
}
