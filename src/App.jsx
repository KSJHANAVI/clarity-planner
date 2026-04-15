import React from 'react'
import { useStore } from './store/useStore'
import { useAuth } from './hooks/useAuth'
import AuthScreen        from './features/auth/AuthScreen'
import OnboardingFlow    from './features/onboarding/OnboardingFlow'
import BrainDumpScreen   from './features/braindump/BrainDumpScreen'
import MatrixView        from './features/matrix/MatrixView'
import CelebrationScreen from './features/celebration/CelebrationScreen'
import ProfileDrawer     from './features/profile/ProfileDrawer'
import Notification      from './components/ui/Notification'
import s from './App.module.css'

export default function App() {
  useAuth() // boots session + loads user data

  const phase = useStore((st) => st.phase)
  const ui    = useStore((st) => st.ui)

  if (phase === 'loading') {
    return (
      <div className={s.loading}>
        <div className={s.loadingMark}>✦</div>
      </div>
    )
  }

  return (
    <>
      {phase === 'auth'        && <AuthScreen />}
      {phase === 'onboarding'  && <OnboardingFlow />}
      {phase === 'braindump'   && <BrainDumpScreen />}
      {phase === 'matrix'      && <MatrixView />}
      {phase === 'celebration' && <CelebrationScreen />}

      {ui.profileDrawerOpen && <ProfileDrawer />}
      <Notification />
    </>
  )
}
