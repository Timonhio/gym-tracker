import { compareWorkouts, isValidSet } from './pr'
import type { SetEntry, Workout } from './types'

export interface LastEntry {
  date: string
  sets: SetEntry[]
}

/**
 * The most recent earlier workout that contains valid sets of this exercise
 * ("Letztes Mal: …"). "Earlier" is relative to `current` (which may be a
 * draft that is not saved yet and is ignored if it is in `workouts`).
 */
export function findLastEntry(
  workouts: Workout[],
  exerciseId: string,
  current: Pick<Workout, 'id' | 'date' | 'createdAt'>,
  bodyweight: boolean,
): LastEntry | null {
  let best: Workout | null = null
  for (const w of workouts) {
    if (w.id === current.id) continue
    if (compareWorkouts(w, current as Workout) >= 0) continue
    const entry = w.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry || !entry.sets.some((s) => isValidSet(s, bodyweight))) continue
    if (!best || compareWorkouts(w, best) > 0) best = w
  }
  if (!best) return null
  const entry = best.entries.find((e) => e.exerciseId === exerciseId)!
  return { date: best.date, sets: entry.sets.filter((s) => isValidSet(s, bodyweight)) }
}
