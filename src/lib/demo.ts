import { addDays, startOfWeek, toISODate } from './dates'
import type { Workout } from './types'

export const DEMO_PREFIX = 'demo-'

/** Small deterministic PRNG so the demo data looks the same every time. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Plan {
  id: string
  /** Starting weight in kg (0 = bodyweight). */
  start: number
  /** kg gained per week. */
  gain: number
  reps: number
  sets: number
}

const PUSH: Plan[] = [
  { id: 'bankdruecken', start: 70, gain: 0.75, reps: 8, sets: 4 },
  { id: 'kh-schraegbankdruecken', start: 24, gain: 0.25, reps: 10, sets: 3 },
  { id: 'schulterdruecken', start: 40, gain: 0.5, reps: 8, sets: 3 },
  { id: 'seitheben', start: 8, gain: 0.1, reps: 12, sets: 3 },
  { id: 'trizepsdruecken', start: 25, gain: 0.4, reps: 12, sets: 3 },
]
const PULL: Plan[] = [
  { id: 'klimmzuege', start: 0, gain: 0, reps: 7, sets: 4 },
  { id: 'rudern-langhantel', start: 60, gain: 0.7, reps: 8, sets: 4 },
  { id: 'latzug', start: 55, gain: 0.5, reps: 10, sets: 3 },
  { id: 'face-pulls', start: 20, gain: 0.3, reps: 15, sets: 3 },
  { id: 'bizepscurls', start: 12, gain: 0.2, reps: 10, sets: 3 },
]
const LEGS: Plan[] = [
  { id: 'kniebeugen', start: 80, gain: 1.25, reps: 6, sets: 4 },
  { id: 'rumaenisches-kreuzheben', start: 80, gain: 1, reps: 8, sets: 3 },
  { id: 'beinpresse', start: 160, gain: 2.5, reps: 10, sets: 3 },
  { id: 'beinbeuger-liegend', start: 40, gain: 0.5, reps: 12, sets: 3 },
  { id: 'wadenheben-stehend', start: 60, gain: 1, reps: 15, sets: 4 },
]

const round25 = (n: number) => Math.round(n / 2.5) * 2.5

/**
 * ~12 weeks of a push / pull / legs split with progressive overload, a few
 * skipped sessions, and no leg day in the last ~10 days (so the "neglected
 * muscle" insight has something to show). All ids start with "demo-".
 */
export function generateDemoWorkouts(now: Date = new Date(), weeks = 12): Workout[] {
  const rand = mulberry32(42)
  const workouts: Workout[] = []
  const thisMonday = startOfWeek(now)
  const todayISO = toISODate(now)
  const noLegsAfter = toISODate(addDays(now, -10))
  let setCounter = 0

  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w)
    const week = weeks - 1 - w // 0 = oldest
    const days: [number, Plan[]][] = [
      [0, PUSH],
      [2, PULL],
      [4, LEGS],
    ]
    if (rand() < 0.35) days.push([5, PUSH])

    for (const [offset, plans] of days) {
      const date = toISODate(addDays(monday, offset))
      if (date > todayISO) continue
      if (rand() < 0.15) continue // skipped session
      if (plans === LEGS && date > noLegsAfter) continue

      const idx = workouts.length
      workouts.push({
        id: `${DEMO_PREFIX}w${idx}`,
        date,
        createdAt: new Date(date + 'T18:00:00').getTime(),
        entries: plans.map((p) => {
          const weight = p.start > 0 ? Math.max(2.5, round25(p.start + p.gain * week + (rand() - 0.5) * 2)) : null
          return {
            exerciseId: p.id,
            sets: Array.from({ length: p.sets }, (_, i) => ({
              id: `${DEMO_PREFIX}s${setCounter++}`,
              reps: Math.max(1, p.reps + Math.round((rand() - 0.5) * 2) - (i > 1 ? 1 : 0) + (p.start === 0 ? Math.floor(week / 4) : 0)),
              weight,
            })),
          }
        }),
      })
    }
  }
  return workouts
}
