import { REGIONS, REGION_OF, type Region } from './exercises'
import { isValidSet } from './pr'
import type { Draft } from './draft'
import type { Exercise, MuscleGroup, Workout } from './types'

/** One exercise of a session with the number of sets that count for it. */
export interface SessionEntry {
  exerciseId: string
  sets: number
}

export interface SessionTargets {
  /** Hit body regions, alphabetical (this is what the list under the body map shows). */
  regions: Region[]
  /** Muscles that are the PRIMARY target of at least one exercise. */
  primary: MuscleGroup[]
  /** Muscles that only assist (never primary in this session). */
  secondary: MuscleGroup[]
  /** Generated name, e.g. "Arms · Chest · Shoulders". */
  name: string
}

/** Fallback name while no exercise has been added. */
export const EMPTY_SESSION_NAME = 'New session'

/**
 * What does this session train? Regions are weighted by the number of sets of
 * the exercises whose PRIMARY muscle lies in them. The name lists the (up to)
 * three most trained regions alphabetically; five or more regions = "Full body".
 */
export function sessionTargets(entries: SessionEntry[], lookup: (id: string) => Exercise): SessionTargets {
  const weight = new Map<Region, number>()
  const primary = new Set<MuscleGroup>()
  const assisting = new Set<MuscleGroup>()

  for (const e of entries) {
    if (e.sets <= 0) continue
    const ex = lookup(e.exerciseId)
    primary.add(ex.primary)
    const r = REGION_OF[ex.primary]
    weight.set(r, (weight.get(r) ?? 0) + e.sets)
    ex.secondary.forEach((m) => assisting.add(m))
  }
  for (const m of primary) assisting.delete(m)

  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1] || REGIONS.indexOf(a[0]) - REGIONS.indexOf(b[0]))
  const regions = ranked.map(([r]) => r).sort((a, b) => a.localeCompare(b, 'en'))
  const top = ranked
    .slice(0, 3)
    .map(([r]) => r)
    .sort((a, b) => a.localeCompare(b, 'en'))

  let name = EMPTY_SESSION_NAME
  if (ranked.length >= 5) name = 'Full body'
  else if (top.length > 0) name = top.join(' · ')

  return { regions, primary: [...primary], secondary: [...assisting], name }
}

/** Saved workout: only valid sets count. */
export function entriesFromWorkout(w: Workout, lookup: (id: string) => Exercise): SessionEntry[] {
  return w.entries
    .map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.filter((s) => isValidSet(s, lookup(e.exerciseId).bodyweight)).length,
    }))
    .filter((e) => e.sets > 0)
}

/** Draft: an exercise that has been added counts with all its set rows (planned sets). */
export function entriesFromDraft(d: Draft): SessionEntry[] {
  return d.entries.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length }))
}

/** The name shown for a saved workout: the custom name, or the generated one. */
export function workoutDisplayName(w: Workout, lookup: (id: string) => Exercise): string {
  const custom = w.name?.trim()
  return custom || sessionTargets(entriesFromWorkout(w, lookup), lookup).name
}
