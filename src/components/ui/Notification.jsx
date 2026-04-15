import React from 'react'
import { useStore } from '../../store/useStore'
import s from './Notification.module.css'

export default function Notification() {
  const notification = useStore((s) => s.ui.notification)
  return (
    <div className={[s.toast, notification ? s.show : '', notification ? s[notification.type] : ''].join(' ')}>
      {notification?.message}
    </div>
  )
}
