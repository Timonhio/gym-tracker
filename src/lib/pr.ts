import type { PRType, SetEntry, Workout } from './types'

/**
 * Personal-record logic. Everything here is a pure function: PRs are never
 * stored, they are *derived* from the workout history. That way editing or
 * deleting an old workout can never leave stale PRs behind.
 *
 * Rules
 *  - A set only counts if it is valid: reps > 0 and (weight > 0 or the
 *    exercise is a bodyweight exercise).
 *  - Equal values are never a PR – you have to beat the old value.
 *  - Workouts are processed chronologically (date, then createdAt), sets in
 *    the order they were entered.
 *  - weight:         heavier than any earlier set.
 *  - reps:           more reps than any earlier set with the same OR higher
 *                    weight (only if there is such an earlier set).
 *  - e1rm:           higher Epley estimate than any earlier set.
 *  - bodyweightReps: sets without added weight: more reps than ever before.
 */

export interface SetLike {
  reps?: number | null
  weight?: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Epley formula. For a single rep the lifted weight itself is the 1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** Nothing entered at all (null / 0 / undefined in both fields). */
export function isEmptySet(s: SetLike): boolean {
  return !(s.reps && s.reps > 0) && !(s.weight && s.weight > 0)
}

export function isValidSet(s: SetLike, bodyweight: boolean): boolean {
  const reps = s.reps ?? 0
  const weight = s.weight ?? 0
  if (!(reps > 0) || weight < 0) return false
  return weight > 0 || bodyweight
}

/** Filled in partly, but not usable (e.g. reps without weight on a barbell lift). */
export function isIncompleteSet(s: SetLike, bodyweight: boolean): boolean {
  return !isEmptySet(s) && !isValidSet(s, bodyweight)
}

// ---------------------------------------------------------------------------

export interface ExerciseState {
  maxWeight: number
  maxE1rm: number
  maxBodyweightReps: number
  /** All earlier weighted sets (used for "reps at same-or-higher weight"). */
  weighted: { weight: number; reps: number }[]
}

export function emptyState(): ExerciseState {
  return { maxWeight: 0, maxE1rm: 0, maxBodyweightReps: 0, weighted: [] }
}

/** Which PRs would this set be, given everything that came before? */
export function evaluateSet(state: ExerciseState, set: SetLike, bodyweight: boolean): PRType[] {
  if (!isValidSet(set, bodyweight)) return []
  const reps = set.reps as number
  const weight = set.weight ?? 0
  const types: PRType[] = []

  if (weight > 0) {
    if (weight > state.maxWeight) types.push('weight')

    let bestRepsAtOrAbove = 0
    let hasComparable = false
    for (const s of state.weighted) {
      if (s.weight >= weight) {
        hasComparable = true
        if (s.reps > bestRepsAtOrAbove) bestRepsAtOrAbove = s.reps
      }
    }
    if (hasComparable && reps > bestRepsAtOrAbove) types.push('reps')

    if (round2(epley1RM(weight, reps)) > round2(state.maxE1rm)) types.push('e1rm')
  } else if (reps > state.maxBodyweightReps) {
    types.push('bodyweightReps')
  }
  return types
}

/** New state after the set has been performed (invalid sets change nothing). */
export function applySet(state: ExerciseState, set: SetLike, bodyweight: boolean): ExerciseState {
  if (!isValidSet(set, bodyweight)) return state
  const reps = set.reps as number
  const weight = set.weight ?? 0
  if (weight > 0) {
    return {
      ...state,
      maxWeight: Math.max(state.maxWeight, weight),
      maxE1rm: Math.max(state.maxE1rm, epley1RM(weight, reps)),
      weighted: [...state.weighted, { weight, reps }],
    }
  }
  return { ...state, maxBodyweightReps: Math.max(state.maxBodyweightReps, reps) }
}

// ---------------------------------------------------------------------------

export function compareWorkouts(a: Workout, b: Workout): number {
  return a.date.localeCompare(b.date) || a.createdAt - b.createdAt || a.id.localeCompare(b.id)
}

export function setKey(workoutId: string, setId: string): string {
  return `${workoutId}/${setId}`
}

export type SetPRMap = Map<string, PRType[]>

/**
 * Replays the whole history and returns, for every set that was a PR at the
 * time it was performed, the PR types. Key: setKey(workoutId, setId).
 */
export function computeSetPRs(
  workouts: Workout[],
  isBodyweight: (exerciseId: string) => boolean,
): SetPRMap {
  const result: SetPRMap = new Map()
  const states = new Map<string, ExerciseState>()

  for (const w of [...workouts].sort(compareWorkouts)) {
    for (const entry of w.entries) {
      const bw = isBodyweight(entry.exerciseId)
      let state = states.get(entry.exerciseId) ?? emptyState()
      for (const set of entry.sets) {
        const types = evaluateSet(state, set, bw)
        if (types.length) result.set(setKey(w.id, set.id), types)
        state = applySet(state, set, bw)
      }
      states.set(entry.exerciseId, state)
    }
  }
  return result
}

// ---------------------------------------------------------------------------

export interface ExercisePRs {
  weight: { weight: number; reps: number; date: string } | null
  e1rm: { value: number; weight: number; reps: number; date: string } | null
  /** Non-dominated (weight, reps) pairs: the best reps at each weight level. */
  repsAtWeight: { weight: number; reps: number; date: string }[]
  bodyweightReps: { reps: number; date: string } | null
}

/** The records that currently stand for one exercise. */
export function currentPRs(
  workouts: Workout[],
  exerciseId: string,
  bodyweight: boolean,
): ExercisePRs {
  const prs: ExercisePRs = { weight: null, e1rm: null, repsAtWeight: [], bodyweightReps: null }

  for (const w of [...workouts].sort(compareWorkouts)) {
    for (const entry of w.entries) {
      if (entry.exerciseId !== exerciseId) continue
      for (const set of entry.sets as SetEntry[]) {
        if (!isValidSet(set, bodyweight)) continue
        const reps = set.reps as number
        const weight = set.weight ?? 0

        if (weight > 0) {
          if (!prs.weight || weight > prs.weight.weight) prs.weight = { weight, reps, date: w.date }

          const value = epley1RM(weight, reps)
          if (!prs.e1rm || round2(value) > round2(prs.e1rm.value)) {
            prs.e1rm = { value, weight, reps, date: w.date }
          }

          const dominated = prs.repsAtWeight.some((r) => r.weight >= weight && r.reps >= reps)
          if (!dominated) {
            prs.repsAtWeight = prs.repsAtWeight.filter((r) => !(r.weight <= weight && r.reps <= reps))
            prs.repsAtWeight.push({ weight, reps, date: w.date })
          }
        } else if (!prs.bodyweightReps || reps > prs.bodyweightReps.reps) {
          prs.bodyweightReps = { reps, date: w.date }
        }
      }
    }
  }
  prs.repsAtWeight.sort((a, b) => a.weight - b.weight)
  return prs
}
