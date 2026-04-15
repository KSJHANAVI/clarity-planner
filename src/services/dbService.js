/**
 * CLARITY DATABASE SERVICE — Firebase
 * Drop-in replacement for the Supabase dbService.
 * All Firebase calls isolated here — components never import Firebase directly.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp, Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase'

// ── Auth ──────────────────────────────────────────────────────────────────
export const signUp = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password)

export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const signInWithGoogle = () =>
  signInWithPopup(auth, new GoogleAuthProvider())

export const signOut = () => firebaseSignOut(auth)

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

// ── User profile ──────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const snap = await getDoc(doc(db, 'profiles', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function upsertProfile(userId, data) {
  const ref     = doc(db, 'profiles', userId)
  const snap    = await getDoc(ref)
  const payload = { ...data, updated_at: serverTimestamp() }
  if (snap.exists()) {
    await updateDoc(ref, payload)
  } else {
    await setDoc(ref, { ...payload, created_at: serverTimestamp() })
  }
  return getProfile(userId)
}

// ── Goals ─────────────────────────────────────────────────────────────────
export async function getGoals(userId) {
  const snap = await getDoc(doc(db, 'goals', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function upsertGoals(userId, goals) {
  const ref     = doc(db, 'goals', userId)
  const snap    = await getDoc(ref)
  const payload = { ...goals, user_id: userId, updated_at: serverTimestamp() }
  if (snap.exists()) {
    await updateDoc(ref, payload)
  } else {
    await setDoc(ref, { ...payload, created_at: serverTimestamp() })
  }
  return getGoals(userId)
}

// ── Tasks ─────────────────────────────────────────────────────────────────
function taskColRef(userId, date) {
  return collection(db, 'tasks', userId, 'sessions', date, 'items')
}

function taskDocRef(userId, date, taskId) {
  return doc(db, 'tasks', userId, 'sessions', date, 'items', taskId)
}

export async function getTasksForDate(userId, date) {
  const q    = query(taskColRef(userId, date), orderBy('priority', 'asc'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !t.deleted_at)
}

export async function insertTasks(tasks) {
  const saved = []
  for (const task of tasks) {
    const { user_id, session_date, ...rest } = task
    const ref = await addDoc(taskColRef(user_id, session_date), {
      ...rest,
      user_id,
      session_date,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    saved.push({ id: ref.id, ...task })
  }
  return saved
}

export async function updateTask(taskId, patch, userId, date) {
  if (!userId || !date) throw new Error('updateTask requires userId and date')
  const ref = taskDocRef(userId, date, taskId)
  await updateDoc(ref, { ...patch, updated_at: serverTimestamp() })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() }
}

export async function softDeleteTask(taskId, userId, date) {
  return updateTask(taskId, { deleted_at: new Date().toISOString() }, userId, date)
}

export async function completeTask(taskId, userId, date) {
  return updateTask(taskId, { completed_at: new Date().toISOString() }, userId, date)
}

export async function uncompleteTask(taskId, userId, date) {
  return updateTask(taskId, { completed_at: null }, userId, date)
}

// ── Energy ────────────────────────────────────────────────────────────────
function energyDocRef(userId, date) {
  return doc(db, 'energy', userId, 'days', date)
}

export async function getEnergy(userId) {
  const today = todayStr()
  const ref   = energyDocRef(userId, today)

  const adminSnap  = await getDoc(doc(db, 'admins', userId))
  const sortsLimit = adminSnap.exists()
    ? (adminSnap.data().sorts_limit ?? 20)
    : 5

  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const fresh = {
      user_id: userId, date: today,
      sorts_used: 0, sorts_limit: sortsLimit,
      created_at: serverTimestamp(),
    }
    await setDoc(ref, fresh)
    return { id: today, ...fresh }
  }

  const data = snap.data()
  if (data.sorts_limit !== sortsLimit) {
    await updateDoc(ref, { sorts_limit: sortsLimit })
    return { id: snap.id, ...data, sorts_limit: sortsLimit }
  }

  return { id: snap.id, ...data }
}

export async function consumeEnergy(userId) {
  const energy = await getEnergy(userId)
  if (energy.sorts_used >= energy.sorts_limit) throw new Error('ENERGY_EMPTY')
  const ref = energyDocRef(userId, todayStr())
  await updateDoc(ref, { sorts_used: energy.sorts_used + 1 })
  return { ...energy, sorts_used: energy.sorts_used + 1 }
}

// ── Rearrangements ────────────────────────────────────────────────────────
export async function logRearrangement(userId, taskId, taskText, fromQ, toQ) {
  try {
    await addDoc(collection(db, 'rearrangements', userId, 'logs'), {
      task_id:       taskId,
      task_text:     taskText,
      from_quadrant: fromQ,
      to_quadrant:   toQ,
      created_at:    serverTimestamp(),
    })
  } catch (e) {
    console.warn('[DB] logRearrangement failed silently:', e)
  }
}

export async function getRecentPatterns(userId, days = 14) {
  try {
    const since = new Date(Date.now() - days * 864e5)
    const q = query(
      collection(db, 'rearrangements', userId, 'logs'),
      where('created_at', '>=', Timestamp.fromDate(since)),
      orderBy('created_at', 'desc'),
      limit(30)
    )
    const snap = await getDocs(q)
    const map  = {}
    for (const d of snap.docs) {
      const r   = d.data()
      const key = `${r.task_text}|${r.to_quadrant}`
      if (!map[key]) map[key] = { text: r.task_text, to_quadrant: r.to_quadrant, count: 0 }
      map[key].count++
    }
    return Object.values(map).filter((p) => p.count >= 2)
  } catch {
    return []
  }
}

// ── XP & Stats ────────────────────────────────────────────────────────────
// Firestore path: stats/{userId}

const XP_PER_QUADRANT = { q1: 30, q2: 20, q3: 10, q4: 5 }

export const LEVELS = [
  { level: 1, label: 'Seed',      minXP: 0     },
  { level: 2, label: 'Sprout',    minXP: 500   },
  { level: 3, label: 'Builder',   minXP: 1500  },
  { level: 4, label: 'Momentum',  minXP: 3500  },
  { level: 5, label: 'Clarity',   minXP: 7500  },
  { level: 6, label: 'Flow',      minXP: 15000 },
  { level: 7, label: 'Legend',    minXP: 30000 },
]

export function getLevelFromXP(xp) {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.minXP) current = l
  }
  const next = LEVELS.find((l) => l.minXP > xp)
  return {
    ...current,
    nextLevel:   next ?? null,
    xpToNext:    next ? next.minXP - xp : 0,
    xpIntoLevel: next ? xp - current.minXP : xp - current.minXP,
    rangeSize:   next ? next.minXP - current.minXP : 1,
  }
}

export async function getStats(userId) {
  const snap = await getDoc(doc(db, 'stats', userId))
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  return { total_xp: 0, current_streak: 0, longest_streak: 0, level: 1 }
}

export async function calculateAndSaveXP(userId, tasks, date) {
  // Calculate raw XP from completed 
  const existingSession = await getDoc(doc(db, 'sessions', userId, 'days', date))
  if (existingSession.exists()) {
    const data = existingSession.data()
    const stats = await getStats(userId)
    return {
      xp_earned:    data.xp_earned,
      raw_xp:       data.xp_earned,
      streak_bonus: data.streak_bonus,
      streak:       data.streak_day,
      stats,
      level_info:   getLevelFromXP(stats.total_xp ?? 0),
    }
  }
  const completed = tasks.filter((t) => t.completed_at && !t.deleted_at)
  const total     = tasks.filter((t) => !t.deleted_at)

  if (completed.length === 0) return { xp_earned: 0, stats: await getStats(userId) }

  let rawXP = completed.reduce((sum, t) => sum + (XP_PER_QUADRANT[t.quadrant] ?? 5), 0)

  // Completion multiplier
  const rate = completed.length / total.length
  if (rate >= 1.0)  rawXP = Math.round(rawXP * 1.5)
  else if (rate >= 0.8) rawXP = Math.round(rawXP * 1.2)

  // Get current stats for streak calculation
  const statsRef  = doc(db, 'stats', userId)
  const statsSnap = await getDoc(statsRef)
  const current   = statsSnap.exists() ? statsSnap.data() : { total_xp: 0, current_streak: 0, longest_streak: 0 }

  // Streak calculation
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const hadYesterdaySnap = await getDoc(doc(db, 'sessions', userId, 'days', yesterdayStr))
  const newStreak = hadYesterdaySnap.exists()
    ? (current.current_streak ?? 0) + 1
    : 1

  // Streak bonuses
  let streakBonus = 0
  if (newStreak >= 30) streakBonus = 500
  else if (newStreak >= 7) streakBonus = 150
  else if (newStreak >= 3) streakBonus = 50

  const totalXPEarned = rawXP + streakBonus
  const newTotalXP    = (current.total_xp ?? 0) + totalXPEarned
  const levelInfo     = getLevelFromXP(newTotalXP)

  // Save session summary
  await setDoc(doc(db, 'sessions', userId, 'days', date), {
    date,
    xp_earned:       totalXPEarned,
    streak_bonus:    streakBonus,
    tasks_total:     total.length,
    tasks_done:      completed.length,
    completion_rate: rate,
    streak_day:      newStreak,
    created_at:      serverTimestamp(),
  })

  // Update lifetime stats
  const newStats = {
    total_xp:        newTotalXP,
    current_streak:  newStreak,
    longest_streak:  Math.max(newStreak, current.longest_streak ?? 0),
    level:           levelInfo.level,
    updated_at:      serverTimestamp(),
  }
  await setDoc(statsRef, newStats)

  return {
    xp_earned:    totalXPEarned,
    raw_xp:       rawXP,
    streak_bonus: streakBonus,
    streak:       newStreak,
    stats:        { ...newStats, id: userId },
    level_info:   levelInfo,
  }
}

export async function getSessionHistory(userId, limitDays = 30) {
  try {
    const q = query(
      collection(db, 'sessions', userId, 'days'),
      orderBy('date', 'desc'),
      limit(limitDays)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

// ── Delete account ────────────────────────────────────────────────────────
export async function deleteAccount(userId) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'profiles', userId), {
    deleted:             true,
    deleted_at:          serverTimestamp(),
    plan:                'deleted',
    onboarding_complete: false,
  })
  batch.delete(doc(db, 'goals', userId))
  await batch.commit()
  const currentUser = auth.currentUser
  if (currentUser) await deleteUser(currentUser)
}

// ── Helpers ───────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]