import { useEffect } from 'react'
import { onAuthChange, getProfile, getGoals } from '../services/dbService'
import { useStore } from '../store/useStore'

export function useAuth() {
  const { setSession, setProfile, setGoals, setPhase } = useStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setSession({ user })
        try {
          const [profile, goals] = await Promise.all([
            getProfile(user.uid).catch(() => null),
            getGoals(user.uid).catch(() => null),
          ])
          setProfile(profile)
          setGoals(goals)
          if (!profile?.onboarding_complete) {
            setPhase('onboarding')
          } else {
            setPhase('braindump')
          }
        } catch (e) {
          console.error('[Auth] loadUserData failed:', e)
          setPhase('auth')
        }
      } else {
        setSession(null)
        setProfile(null)
        setGoals(null)
        setPhase('auth')
      }
    })

    return () => unsubscribe()
  }, [])
}
