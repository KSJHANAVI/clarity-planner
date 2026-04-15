# ✦ Clarity — Declutter your life

A goal-first, AI-powered Eisenhower matrix planner built by Jhanavi KS.

Clarity doesn't just organise your to-dos. It learns your goals — where you want to be in 30 days, by year end, and in three years — then every task you add gets sorted comparatively against everything else on your plate, aligned to who you're trying to become.

---

## What makes it different

Most productivity apps ask you to categorise your own tasks. That defeats the purpose — you're still making the same decisions you were already overwhelmed by.

Clarity flips this. You brain dump everything first. Then one AI call looks at all your tasks together, relative to each other and your goals, and places them into the right quadrant with the right priority. You see the result. You can override anything. But the cognitive work is already done.

---

## Features

- **Goal onboarding** — 5-step wizard captures monthly, annual, and 3-year goals plus your work context and the five people who matter most to you
- **Gender-inferred energy icon** — flower, flame, or crystal (inferred from your name, never asked)
- **Brain dump** — enter all tasks with optional deadline and time estimate
- **One comparative AI sort** — Claude sees all tasks together and ranks them relative to each other and your goals
- **Eisenhower matrix** — Do First / Schedule / Delegate / Eliminate with priority order within each quadrant
- **Smart re-sort** — existing tasks get updated, only new ones get inserted. No duplicates
- **Duplicate detection** — warns you inline as you type, disables sort until resolved
- **Overload warning** — if your total estimated time exceeds your earliest deadline, you're warned before sorting
- **Daily sessions** — each day is a fresh start. History is preserved forever
- **XP system** — earn XP per completed task (weighted by quadrant), with completion multipliers and streak bonuses
- **Levels** — Seed → Sprout → Builder → Momentum → Clarity → Flow → Legend
- **Session history** — every day logged with completion rate, XP earned, streak
- **Profile drawer** — edit any goal tier, view stats, history
- **Delete account** — anonymises your data rather than destroying it. Your task patterns stay as training signal
- **Admin exception list** — configurable per-user sort limits via Firestore
- **Energy wall** — friendly Duolingo-style limit (5 sorts/day free) with countdown to reset

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| State | Zustand |
| Styling | CSS Modules + CSS custom properties |
| Auth + DB | Firebase (Auth + Firestore) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Deploy | Vercel |

---

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/clarity-planner.git
cd clarity-planner
npm install

# 2. Set up Firebase
# console.firebase.google.com → new project → web app
# Enable Email/Password + Google auth
# Create Firestore database (production mode, Singapore region)
# Paste firestore.rules into Firebase Console → Firestore → Rules → Publish

# 3. Environment
cp .env.example .env
# Fill in VITE_FIREBASE_* values from Firebase console
# Fill in VITE_ANTHROPIC_API_KEY from console.anthropic.com

# 4. Run
npm run dev
```

## Deploy to Vercel

```bash
vercel
# Add all VITE_* env vars in Vercel dashboard → Settings → Environment Variables
vercel --prod
```

Add your Vercel domain to Firebase Console → Authentication → Authorised domains.

---

## Project structure

```
src/
├── components/
│   ├── ui/           Button, Field, Modal, EnergyIcon, Notification
│   └── layout/       AppHeader
├── features/
│   ├── auth/         AuthScreen
│   ├── onboarding/   OnboardingFlow — 5-step goal wizard
│   ├── braindump/    BrainDumpScreen — daily task entry
│   ├── matrix/       MatrixView, Quadrant, TaskCard, AddMoreModal
│   ├── celebration/  CelebrationScreen — XP + quote
│   └── profile/      ProfileDrawer — goals, stats, history
├── hooks/            useAuth, useDragDrop
├── services/         aiService.js, dbService.js, firebase.js
├── store/            useStore.js — Zustand
├── styles/           tokens.css, global.css
└── utils/            quadrants.js, date.js
```

---

## Extending for v2

- **New theme** → add `[data-theme="v2"]` block in `src/styles/tokens.css`
- **Swap AI model** → edit `src/services/aiService.js` only
- **Fine-tuned model** → every user rearrangement is already logged in Firestore as training data
- **Better drag-and-drop** → replace `src/hooks/useDragDrop.js` internals with dnd-kit
- **Stripe payments** → `consumeEnergy` in `dbService.js` is the integration point for plan upgrades
- **Backend API proxy** → update `API_URL` in `aiService.js` to point to your own server
- **Voiceover feature** -> instead of typing out goals, I could use the voice button, take input as voice and covert to text to store

---

## License

MIT — built by Jhanavi KS
