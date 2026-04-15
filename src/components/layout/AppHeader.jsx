import React, { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import EnergyIcon from '../ui/EnergyIcon'
import Button from '../ui/Button'
import { getStats, getLevelFromXP } from '../../services/dbService'
import s from './AppHeader.module.css'

export default function AppHeader() {
  const profile  = useStore((st) => st.profile)
  const energy   = useStore((st) => st.energy)
  const setUI    = useStore((st) => st.setUI)
  const phase    = useStore((st) => st.phase)
  const setPhase = useStore((st) => st.setPhase)
  const session  = useStore((st) => st.session)

  const [levelInfo, setLevelInfo] = useState(null)

  useEffect(() => {
    if (!session?.user) return
    getStats(session.user.uid).then((stats) => {
      setLevelInfo(getLevelFromXP(stats.total_xp ?? 0))
    }).catch(console.error)
  }, [session])

  const initials    = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const gender     = profile?.gender ?? 'neutral'
  const sortsUsed  = energy?.sorts_used ?? 0
  const sortsLimit = energy?.sorts_limit ?? 5

  return (
    <header className={s.header}>
      <div className={s.logo}>
        <span className={s.logoMark}>✦</span>
        <span className={s.logoText}>Clarity</span>
        <span className={s.logoSub}>Declutter your Life</span>
      </div>

      <div className={s.right}>
        {/* Level badge */}
        {levelInfo && (
          <div className={s.levelWrap} title={`${levelInfo.label} — ${levelInfo.xpToNext ? `${levelInfo.xpToNext} XP to next level` : 'Max level'}`}>
            <span className={s.levelBadge}>Lv {levelInfo.level}</span>
            <span className={s.levelLabel}>{levelInfo.label}</span>
          </div>
        )}

        {/* Energy display */}
        <EnergyIcon gender={gender} used={sortsUsed} limit={sortsLimit} />

        {phase === 'matrix' && (
          <Button size="sm" variant="ghost" onClick={() => setPhase('braindump')}>
            ← Brain dump
          </Button>
        )}

        <button
          className={s.avatar}
          onClick={() => setUI({ profileDrawerOpen: true })}
          title="Profile & goals"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}