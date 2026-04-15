import React, { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getLevelFromXP } from '../../services/dbService'
import Button from '../../components/ui/Button'
import s from './CelebrationScreen.module.css'

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 1.5,
  dur: 1.8 + Math.random() * 1.2,
  size: 4 + Math.random() * 6,
  color: ['#C4956A','#ED93B1','#7F77DD','#3A6B4A','#EF9F27','#D4537E'][i % 6],
}))

export default function CelebrationScreen() {
  const profile    = useStore((st) => st.profile)
  const setPhase   = useStore((st) => st.setPhase)
  const setTasks   = useStore((st) => st.setTasks)
  const ui         = useStore((st) => st.ui)
  const quote      = ui.celebrationQuote
  const xpResult   = ui.celebrationXP
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleNewDay = () => {
    setTasks([])
    setUI({ celebrationShown: false, celebrationQuote: null, celebrationXP: null })
    setPhase('braindump')
  }

  return (
    <div className={[s.page, visible ? s.visible : ''].join(' ')}>
      <div className={s.particles} aria-hidden>
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className={s.particle}
            style={{
              left: `${p.x}%`,
              width: p.size, height: p.size,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      <div className={s.content}>
        <div className={s.mark}>✦</div>

        <h1 className={s.headline}>
          Every task done,<br />{profile?.name ?? 'friend'}.
        </h1>

        {quote && (
          <blockquote className={s.quote}>
            <p className={s.quoteText}>"{quote}"</p>
          </blockquote>
        )}

        <CompletionStats />

        {/* XP earned this session */}
        {xpResult && <XPBlock xpResult={xpResult} />}

        <div className={s.actions}>
          <Button variant="primary" size="lg" onClick={handleNewDay}>
            Start fresh tomorrow
          </Button>
          <Button variant="ghost" size="md" onClick={() => setPhase('matrix')}>
            Back to board
          </Button>
        </div>
      </div>
    </div>
  )
}

function XPBlock({ xpResult }) {
  const { xp_earned, streak_bonus, streak, stats, level_info } = xpResult
  const progressPct = level_info?.nextLevel
    ? Math.round((level_info.xpIntoLevel / level_info.rangeSize) * 100)
    : 100

  return (
    <div className={s.xpBlock}>
      <div className={s.xpEarned}>
        <span className={s.xpNum}>+{xp_earned}</span>
        <span className={s.xpLabel}>XP earned</span>
      </div>
      {streak_bonus > 0 && (
        <p className={s.xpBonus}>+{streak_bonus} streak bonus · {streak} day streak 🔥</p>
      )}
      <div className={s.levelRow}>
        <span className={s.levelBadge}>Level {level_info?.level} · {level_info?.label}</span>
        {level_info?.nextLevel && (
          <span className={s.xpToNext}>{level_info.xpToNext} XP to {level_info.nextLevel.label}</span>
        )}
      </div>
      <div className={s.xpBar}>
        <div className={s.xpBarFill} style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}

function CompletionStats() {
  const tasks = useStore((st) => st.tasks)
  const byQ   = { q1: 0, q2: 0, q3: 0, q4: 0 }
  tasks.filter((t) => t.completed_at && !t.deleted_at)
    .forEach((t) => { byQ[t.quadrant] = (byQ[t.quadrant] || 0) + 1 })

  const total = Object.values(byQ).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  return (
    <div className={s.stats}>
      <div className={s.statItem}>
        <span className={s.statNum}>{total}</span>
        <span className={s.statLabel}>tasks done</span>
      </div>
      {byQ.q1 > 0 && (
        <div className={s.statItem}>
          <span className={s.statNum} style={{ color:'var(--q1-ink)' }}>{byQ.q1}</span>
          <span className={s.statLabel}>fires out</span>
        </div>
      )}
      {byQ.q2 > 0 && (
        <div className={s.statItem}>
          <span className={s.statNum} style={{ color:'var(--q2-ink)' }}>{byQ.q2}</span>
          <span className={s.statLabel}>seeds planted</span>
        </div>
      )}
    </div>
  )
}