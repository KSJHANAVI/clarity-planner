import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { upsertGoals, signOut, deleteAccount, getStats, getLevelFromXP, getSessionHistory } from '../../services/dbService'
import Button from '../../components/ui/Button'
import { Textarea, Input } from '../../components/ui/Field'
import s from './ProfileDrawer.module.css'

const GOAL_SECTIONS = [
  {
    key:   'monthly',
    label: 'This month',
    fields: [
      { id: 'monthly_primary', label: 'Goals', multi: true, placeholder: 'Your monthly goals…' },
      { id: 'monthly_success', label: 'Success looks like', placeholder: 'One sentence win condition…' },
    ],
  },
  {
    key:   'annual',
    label: 'This year',
    fields: [
      { id: 'annual_primary', label: 'Goals', multi: true, placeholder: 'Your annual goals…' },
      { id: 'annual_fear',    label: 'Fear of not achieving', placeholder: 'The thing that keeps you up…' },
    ],
  },
  {
    key:   'threeyear',
    label: '3-year vision',
    fields: [
      { id: 'three_year_vision',     label: 'Vision',     multi: true, placeholder: 'Who are you in 3 years?' },
      { id: 'three_year_daily_life', label: 'Daily life',             placeholder: 'What does your ideal day look like?' },
    ],
  },
]

export default function ProfileDrawer() {
  const profile          = useStore((st) => st.profile)
  const goals            = useStore((st) => st.goals)
  const energy           = useStore((st) => st.energy)
  const setGoals         = useStore((st) => st.setGoals)
  const setUI            = useStore((st) => st.setUI)
  const showNotification = useStore((st) => st.showNotification)
  const session          = useStore((st) => st.session)

  const [editingSection, setEditingSection]       = useState(null)
  const [draftGoals, setDraftGoals]               = useState({})
  const [saving, setSaving]                       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]                   = useState(false)
  const [stats, setStats]                         = useState(null)
  const [levelInfo, setLevelInfo]                 = useState(null)
  const [history, setHistory]                     = useState([])
  const [historyLimit, setHistoryLimit]           = useState(7)
  const [loadingHistory, setLoadingHistory]       = useState(false)

  const close = () => setUI({ profileDrawerOpen: false })

  useEffect(() => {
    if (!session?.user) return
    getStats(session.user.uid).then((s) => {
      setStats(s)
      setLevelInfo(getLevelFromXP(s.total_xp ?? 0))
    }).catch(console.error)
    loadHistory(7)
  }, [session])

  const loadHistory = async (days) => {
    setLoadingHistory(true)
    try {
      const h = await getSessionHistory(session.user.uid, days)
      setHistory(h)
      setHistoryLimit(days)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const startEdit = (sectionKey) => {
    setEditingSection(sectionKey)
    const section = GOAL_SECTIONS.find((s) => s.key === sectionKey)
    const seed = {}
    section.fields.forEach((f) => { seed[f.id] = goals?.[f.id] ?? '' })
    setDraftGoals(seed)
  }

  const cancelEdit = () => { setEditingSection(null); setDraftGoals({}) }

  const saveSection = async () => {
    setSaving(true)
    try {
      const updated = await upsertGoals(session.user.uid, { ...goals, ...draftGoals })
      setGoals(updated)
      setEditingSection(null)
      setDraftGoals({})
      showNotification('Goals updated ✓', 'success')
    } catch (e) {
      showNotification('Failed to save. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    close()
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount(session.user.uid)
    } catch (e) {
      setDeleting(false)
      setShowDeleteConfirm(false)
      if (e.code === 'auth/requires-recent-login') {
        showNotification('Please sign out and sign back in, then try again.', 'error')
      } else {
        showNotification('Something went wrong. Try again.', 'error')
      }
    }
  }

  const initials   = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const sortsLeft  = energy ? Math.max(0, energy.sorts_limit - energy.sorts_used) : '—'
  const sortsLimit = energy?.sorts_limit ?? 5
  const plan       = profile?.plan ?? 'free'
  const progressPct = levelInfo?.nextLevel
    ? Math.round((levelInfo.xpIntoLevel / levelInfo.rangeSize) * 100)
    : 100

  return (
    <>
      <div className={s.overlay} onClick={close} />

      <aside className={s.drawer}>
        <div className={s.drawerInner}>

          {/* Header */}
          <div className={s.head}>
            <div className={s.avatar}>{initials}</div>
            <div className={s.headInfo}>
              <p className={s.headName}>{profile?.name ?? '—'}</p>
              <p className={s.headEmail}>{session?.user?.email ?? '—'}</p>
            </div>
            <button className={s.closeBtn} onClick={close}>✕</button>
          </div>

          {/* XP & Level block */}
          {levelInfo && (
            <div className={s.xpBlock}>
              <div className={s.xpRow}>
                <span className={s.xpLevel}>Level {levelInfo.level} · {levelInfo.label}</span>
                <span className={s.xpTotal}>{(stats?.total_xp ?? 0).toLocaleString()} XP</span>
              </div>
              <div className={s.xpBarWrap}>
                <div className={s.xpBarFill} style={{ width: `${progressPct}%` }} />
              </div>
              {levelInfo.nextLevel && (
                <p className={s.xpNext}>{levelInfo.xpToNext} XP to {levelInfo.nextLevel.label}</p>
              )}
              <div className={s.streakRow}>
                <span className={s.streakItem}>🔥 {stats?.current_streak ?? 0} day streak</span>
                <span className={s.streakItem}>⚡ Best: {stats?.longest_streak ?? 0} days</span>
              </div>
            </div>
          )}

          {/* Energy summary */}
          <div className={s.energyBar}>
            <span className={s.energyLabel}>
              {sortsLeft} of {sortsLimit} sorts remaining today
            </span>
            <span className={[s.planBadge, plan === 'pro' ? s.pro : ''].join(' ')}>
              {plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>

          <div className={s.divider} />

          {/* History */}
          <div className={s.historySection}>
            <p className={s.sectionTitle}>History</p>
            {history.length === 0 && !loadingHistory && (
              <p className={s.historyEmpty}>No sessions yet — complete your first day!</p>
            )}
            {history.map((session) => {
              const pct = session.tasks_total > 0
                ? Math.round((session.tasks_done / session.tasks_total) * 100)
                : 0
              const filled = Math.round(pct / 20) // 0-5 blocks
              return (
                <div key={session.id} className={s.historyRow}>
                  <span className={s.historyDate}>{session.date}</span>
                  <div className={s.historyBar}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className={[s.historyBlock, i < filled ? s.historyBlockFilled : ''].join(' ')} />
                    ))}
                  </div>
                  <span className={s.historyMeta}>{session.tasks_done}/{session.tasks_total}</span>
                  <span className={s.historyXP}>+{session.xp_earned} XP</span>
                </div>
              )
            })}
            {history.length > 0 && (
              <button
                className={s.loadMoreBtn}
                onClick={() => loadHistory(historyLimit + 30)}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>

          <div className={s.divider} />

          {/* Goal sections */}
          <div className={s.goalsList}>
            <p className={s.sectionTitle}>Goals</p>

            {GOAL_SECTIONS.map((section) => {
              const isEditing = editingSection === section.key
              return (
                <div key={section.key} className={s.goalSection}>
                  <div className={s.goalSectionHead}>
                    <span className={s.goalSectionLabel}>{section.label}</span>
                    {!isEditing && (
                      <button className={s.editBtn} onClick={() => startEdit(section.key)}>
                        <PencilIcon /> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className={s.editFields}>
                      {section.fields.map((f) => (
                        <div key={f.id} className={s.editField}>
                          <label className={s.editLabel}>{f.label}</label>
                          {f.multi ? (
                            <Textarea
                              value={draftGoals[f.id] ?? ''}
                              onChange={(v) => setDraftGoals((d) => ({ ...d, [f.id]: v }))}
                              placeholder={f.placeholder}
                              rows={3}
                            />
                          ) : (
                            <Input
                              value={draftGoals[f.id] ?? ''}
                              onChange={(v) => setDraftGoals((d) => ({ ...d, [f.id]: v }))}
                              placeholder={f.placeholder}
                            />
                          )}
                        </div>
                      ))}
                      <div className={s.editActions}>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={saveSection} loading={saving}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className={s.goalPreview}>
                      {section.fields.map((f) => {
                        const val = goals?.[f.id]
                        if (!val) return null
                        const lines = val.split('\n').filter(Boolean).slice(0, 3)
                        return lines.map((line, i) => (
                          <p key={`${f.id}-${i}`} className={s.previewLine}>{line}</p>
                        ))
                      })}
                      {!section.fields.some((f) => goals?.[f.id]) && (
                        <p className={s.previewEmpty}>Not set yet</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className={s.divider} />

          {/* Account actions */}
          <div className={s.accountActions}>
            {plan === 'free' && (
              <Button
                variant="primary" size="sm"
                onClick={() => showNotification('Upgrade coming soon!', 'default')}
                className={s.fullWidth}
              >
                Upgrade to Pro — 50 sorts/day
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className={s.fullWidth}>
              Sign out
            </Button>

            <div className={s.deleteSection}>
              <p className={s.deleteNote}>
                Deleting your account removes your personal information permanently.
                Your anonymised task patterns may be retained to improve Clarity for everyone.
              </p>
              <Button
                variant="danger" size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className={s.fullWidth}
              >
                Delete my account
              </Button>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className={s.confirmOverlay}>
              <div className={s.confirmBox}>
                <p className={s.confirmEmoji}>✦</p>
                <h3 className={s.confirmTitle}>
                  Oh, we want to help you achieve your goals.
                </h3>
                <p className={s.confirmMsg}>
                  Are you sure you don't want to be here?
                </p>
                <div className={s.confirmActions}>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Stay — I have goals to crush
                  </Button>
                  <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteAccount}>
                    Yes, delete my account
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5,1.5 L10.5,3.5 L3.5,10.5 L1,11 L1.5,8.5 Z"/>
      <line x1="7" y1="3" x2="9" y2="5"/>
    </svg>
  )
}