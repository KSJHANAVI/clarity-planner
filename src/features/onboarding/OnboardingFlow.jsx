import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { processOnboarding } from '../../services/aiService'
import { upsertProfile, upsertGoals } from '../../services/dbService'
import Button from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import s from './OnboardingFlow.module.css'

const STEPS = ['welcome', 'monthly', 'workcontext', 'annual', 'threeyear', 'processing']

export default function OnboardingFlow() {
  const session    = useStore((st) => st.session)
  const setProfile = useStore((st) => st.setProfile)
  const setGoals   = useStore((st) => st.setGoals)
  const setPhase   = useStore((st) => st.setPhase)

  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '', focusArea: '',
    monthlyPrimary: '', monthlySuccess: '',
    workRole: '', workProjects: '', workColleagues: '', fivePeople: '',
    annualPrimary: '', annualFear: '',
    threeYearVision: '', threeYearDailyLife: '',
  })

  const set = (key) => (val) => setData((d) => ({ ...d, [key]: val }))

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => s - 1)

  const finish = async () => {
    setStep(5) // processing is index 5
    const userId = session.user.uid

    const profile = {
      name:             data.name,
      focus_area:       data.focusArea,
      work_role:        data.workRole,
      work_projects:    data.workProjects,
      work_colleagues:  data.workColleagues,
      five_people:      data.fivePeople,
    }
    const goals = {
      monthly_primary:       data.monthlyPrimary,
      monthly_success:       data.monthlySuccess,
      annual_primary:        data.annualPrimary,
      annual_fear:           data.annualFear,
      three_year_vision:     data.threeYearVision,
      three_year_daily_life: data.threeYearDailyLife,
    }

    try {
      const result = await processOnboarding(profile, goals)

      const savedProfile = await upsertProfile(userId, {
        ...profile,
        gender:              result.gender,
        onboarding_complete: true,
        plan:                'free',
      })

      const savedGoals = await upsertGoals(userId, {
        ...goals,
        goal_summary: result.goal_summary,
      })

      setProfile(savedProfile)
      setGoals(savedGoals)
      setPhase('braindump')
    } catch (e) {
      console.error('[Onboarding] failed:', e)
      const savedProfile = await upsertProfile(userId, { ...profile, gender: 'neutral', onboarding_complete: true, plan: 'free' })
      const savedGoals   = await upsertGoals(userId, { ...goals, goal_summary: '' })
      setProfile(savedProfile)
      setGoals(savedGoals)
      setPhase('braindump')
    }
  }

  const stepName = STEPS[step]

  return (
    <div className={s.page}>
      <div className={s.card}>
        {step < 5 && (
          <div className={s.dots}>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className={[s.dot, i===step?s.active:'', i<step?s.done:''].join(' ')} />
            ))}
          </div>
        )}

        {stepName === 'welcome' && (
          <Step label="Welcome" title={<>Before tasks,<br/>let's talk about <em>why</em>.</>}
            desc="Clarity learns your goals so it can think alongside you every single day. A few questions first."
            progress="1 of 5" onNext={next} nextLabel="Let's go →">
            <Field label="Your name" hint="We'll use this to personalise everything.">
              <Input value={data.name} onChange={set('name')} placeholder="What should we call you?" autoFocus />
            </Field>
            <Field label="What area of life are you most focused on right now?" hint="Be specific — career pivot, startup, health, relationships…">
              <Input value={data.focusArea} onChange={set('focusArea')} placeholder="e.g. building my first SaaS, getting fit, becoming a better parent…" />
            </Field>
          </Step>
        )}

        {stepName === 'monthly' && (
          <Step label="This month" title="What must happen in the next 30 days?"
            desc="Think deliverables, milestones, things that feel urgent or exciting. The more detail, the smarter Clarity gets."
            progress="2 of 5" onNext={next} onBack={back}>
            <Field label="Your monthly goals" hint="List as many as you like, one per line.">
              <Textarea value={data.monthlyPrimary} onChange={set('monthlyPrimary')} rows={4}
                placeholder={"e.g. Launch the beta of my app\nGet 5 paying customers\nExercise 4x a week\nFinish the landing page copy"} />
            </Field>
            <Field label="What would make this month feel like a genuine success?">
              <Input value={data.monthlySuccess} onChange={set('monthlySuccess')} placeholder="One sentence — your personal definition of a win." />
            </Field>
          </Step>
        )}

        {stepName === 'workcontext' && (
          <Step label="Your world" title="Help Clarity think like your assistant."
            desc="The more context you give, the smarter your daily sort gets. Clarity uses this to understand which tasks are genuinely important to you — not just urgent — so it stops treating your sprint work like someone else's errand."
            progress="3 of 5" onNext={next} onBack={back}>
            <Field label="What do you do?" hint="Your role and where you work.">
              <Input value={data.workRole} onChange={set('workRole')}
                placeholder="e.g. Backend engineer at a fintech startup" />
            </Field>
            <Field label="What are you currently working on?" hint="Projects, sprints, deliverables — the more specific the better.">
              <Textarea value={data.workProjects} onChange={set('workProjects')} rows={3}
                placeholder="e.g. Building Payflow — a payment engine. Current sprint includes DB Stories, API auth, dashboard work" />
            </Field>
            <Field label="Who do you regularly work with?" hint="Teammates, managers, clients — so Clarity knows whose requests carry weight.">
              <Input value={data.workColleagues} onChange={set('workColleagues')}
                placeholder="e.g. Pradeep (teammate), Anjali (PM), client reviews on Fridays" />
            </Field>
            <Field label="Who are your five people?"
              hint="The ones whose names show up in your tasks and always deserve your time. Clarity will treat anything involving them as high priority automatically.">
              <Input value={data.fivePeople} onChange={set('fivePeople')}
                placeholder="e.g. Amma, Appa, Karthik, Meera, Priya" />
            </Field>
          </Step>
        )}

        {stepName === 'annual' && (
          <Step label="This year" title="Where do you want to be by December?"
            desc="Think bigger. What identity shift, capability, or achievement would represent a meaningful year?"
            progress="4 of 5" onNext={next} onBack={back}>
            <Field label="Your annual goals">
              <Textarea value={data.annualPrimary} onChange={set('annualPrimary')} rows={4}
                placeholder={"e.g. Product generating $5k/month\nBe in the best shape of my life\nWrite a book draft\nBuild a team of 3"} />
            </Field>
            <Field label="What's the one thing you fear not achieving this year?" hint="Be honest — this is just between you and Clarity.">
              <Input value={data.annualFear} onChange={set('annualFear')} placeholder="The thing that keeps you up at night…" />
            </Field>
          </Step>
        )}

        {stepName === 'threeyear' && (
          <Step label="The big picture" title={<>Three years from now —<br/><em>who are you?</em></>}
            desc="This is your north star. The clearer and more vivid, the better Clarity can align every daily task to it."
            progress="5 of 5" onNext={finish} nextLabel="Build my planner ✦" onBack={back}>
            <Field label="Your 3-year vision" hint="Be expansive. Think identity, not just achievements.">
              <Textarea value={data.threeYearVision} onChange={set('threeYearVision')} rows={5}
                placeholder={"e.g. I run a profitable SaaS with a small remote team. I work 5 focused hours a day. I travel 3 months a year. I'm known in my field for…"} />
            </Field>
            <Field label="What does your ideal daily life look like then?">
              <Input value={data.threeYearDailyLife} onChange={set('threeYearDailyLife')} placeholder="Morning routine, work style, energy, relationships, environment…" />
            </Field>
          </Step>
        )}

        {stepName === 'processing' && <Processing />}
      </div>
    </div>
  )
}

function Step({ label, title, desc, children, onNext, onBack, nextLabel = 'Continue →', progress }) {
  return (
    <div className={s.step}>
      {label && <p className={s.label}>{label}</p>}
      <h2 className={s.title}>{title}</h2>
      {desc && <p className={s.desc}>{desc}</p>}
      <div className={s.fields}>{children}</div>
      <div className={s.footer}>
        {onBack
          ? <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          : <span />}
        {progress && <span className={s.progress}>{progress}</span>}
        <Button variant="primary" size="sm" onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  )
}

const MSGS = [
  'Understanding your vision…',
  'Mapping your goals…',
  'Crafting your first tasks…',
  'Detecting your style…',
  'Almost ready…',
]

function Processing() {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    const iv = setInterval(() => setI((x) => (x + 1) % MSGS.length), 1800)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className={s.processing}>
      <div className={s.spinner} />
      <p className={s.processingMsg}>{MSGS[i]}</p>
      <p className={s.processingSub}>Clarity is reading your goals and thinking through your first tasks.</p>
    </div>
  )
}