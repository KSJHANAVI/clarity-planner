import React, { useState } from 'react'
import { signIn, signUp, signInWithGoogle } from '../../services/dbService'
import { useStore } from '../../store/useStore'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import s from './AuthScreen.module.css'

export default function AuthScreen() {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const showNotification      = useStore((s) => s.showNotification)

  const handleSubmit = async () => {
    if (!email || !password) return setError('Email and password are required.')
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.')
    setLoading(true); setError('')
    try {
      if (mode === 'signup') {
        const { error: e } = await signUp(email, password)
        if (e) throw e
        showNotification('Account created! Check your email to verify.', 'success')
      } else {
        const { error: e } = await signIn(email, password)
        if (e) throw e
      }
    } catch (e) {
      setError(e.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const { error: e } = await signInWithGoogle()
      if (e) throw e
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.top}>
          <span className={s.mark}>✦</span>
          <h1 className={s.title}>Clarity</h1>
          <p className={s.sub}>Goal-first. AI-sorted. Clutter-free.</p>
        </div>

        <div className={s.fields}>
          {mode === 'signup' && (
            <Field label="Your name">
              <Input value={name} onChange={setName} placeholder="What should we call you?" autoFocus />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus={mode === 'signin'} />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={setPassword} placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </Field>
          {error && <p className={s.error}>{error}</p>}
        </div>

        <div className={s.actions}>
          <Button variant="primary" size="lg" onClick={handleSubmit} loading={loading} className={s.fullWidth}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
          <div className={s.divider}><span>or</span></div>
          <Button variant="default" size="lg" onClick={handleGoogle} className={s.fullWidth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className={s.toggle}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button className={s.toggleBtn} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
