import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────
  session: null,
  profile: null,
  goals: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setGoals: (goals) => set({ goals }),

  // ── App phase ─────────────────────────────────────────────────────────
  // 'loading' | 'auth' | 'onboarding' | 'braindump' | 'matrix' | 'celebration'
  phase: 'loading',
  setPhase: (phase) => set({ phase }),

  // ── Tasks ─────────────────────────────────────────────────────────────
  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addTasks: (newTasks) =>
    set((s) => ({ tasks: [...s.tasks, ...newTasks] })),

  // ── Energy ────────────────────────────────────────────────────────────
  energy: null, // { sorts_used, sorts_limit, date }
  setEnergy: (energy) => set({ energy }),

  // ── UI ────────────────────────────────────────────────────────────────
  ui: {
    profileDrawerOpen: false,
    addMoreModalOpen: false,
    notification: null,
    celebrationQuote: null,
    celebrationXP: null,
    celebrationShown:  false,
  },

  setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  showNotification: (message, type = 'default') => {
    const id = Date.now()
    set((s) => ({ ui: { ...s.ui, notification: { id, message, type } } }))
    setTimeout(
      () =>
        set((s) =>
          s.ui.notification?.id === id
            ? { ui: { ...s.ui, notification: null } }
            : s
        ),
      3000
    )
  },

  // ── Selectors ─────────────────────────────────────────────────────────
  getActiveTasks: () =>
    get().tasks.filter((t) => !t.completed_at && !t.deleted_at),

  getTasksByQuadrant: (q) =>
    get()
      .tasks.filter((t) => t.quadrant === q && !t.deleted_at)
      .sort((a, b) => a.priority - b.priority),

  allActiveTasksDone: () => {
    const active = get().tasks.filter((t) => !t.deleted_at)
    return active.length > 0 && active.every((t) => t.completed_at)
  },
}))
