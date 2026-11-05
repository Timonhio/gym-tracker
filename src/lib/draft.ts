import { uid } from './format'
import { isEmptySet, isIncompleteSet, isValidSet } from './pr'
import type { SetEntry, Workout } from './types'

/**
 * The workout form works with *text* (what the user typed) so that inputs like
 * "62," or "62,5" behave. Numbers are only parsed when we need them.
 */
export interface DraftSet {
  id: string
  reps: string
  weight: string
}
export interface DraftEntry {
  exerciseId: string
  sets: DraftSet[]
}
export interface Draft {
  date: string
  entries: DraftEntry[]
}

export const DEFAULT_SET_COUNT = 3

/** "62,5" / "62.5" -> 62.5. Empty, negative or garbage -> null. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function newDraftSet(): DraftSet {
  return { id: uid(), reps: '', weight: '' }
}

export function newDraftEntry(exerciseId: string): DraftEntry {
  return { exerciseId, sets: Array.from({ length: DEFAULT_SET_COUNT }, newDraftSet) }
}

export function toSetEntry(s: DraftSet): SetEntry {
  const reps = parseNumber(s.reps)
  return { id: s.id, reps: reps === null ? null : Math.round(reps), weight: parseNumber(s.weight) }
}

/** Everything as typed (incl. empty/incomplete sets). Used for the live PR preview. */
export function draftToPreviewWorkout(draft: Draft, id: string, createdAt: number): Workout {
  return {
    id,
    date: draft.date,
    createdAt,
    entries: draft.entries.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.map(toSetEntry) })),
  }
}

/** What gets saved: empty sets are dropped, and so are exercises without any valid set. */
export function draftToWorkout(
  draft: Draft,
  id: string,
  createdAt: number,
  isBodyweight: (exerciseId: string) => boolean,
): Workout {
  const entries = draft.entries
    .map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map(toSetEntry).filter((s) => isValidSet(s, isBodyweight(e.exerciseId))),
    }))
    .filter((e) => e.sets.length > 0)
  return { id, date: draft.date, createdAt, entries }
}

/** Ids of sets that are filled in only partly (e.g. reps but no weight). */
export function incompleteSetIds(draft: Draft, isBodyweight: (exerciseId: string) => boolean): Set<string> {
  const ids = new Set<string>()
  for (const e of draft.entries) {
    for (const s of e.sets) {
      if (isIncompleteSet(toSetEntry(s), isBodyweight(e.exerciseId))) ids.add(s.id)
    }
  }
  return ids
}

export function workoutToDraft(w: Workout): Draft {
  return {
    date: w.date,
    entries: w.entries.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map((s) => ({
        id: s.id,
        reps: s.reps === null ? '' : String(s.reps),
        weight: s.weight === null ? '' : String(s.weight).replace('.', ','),
      })),
    })),
  }
}

/** True if nothing has been entered yet (no exercises, or only empty sets). */
export function isDraftBlank(draft: Draft): boolean {
  return draft.entries.every((e) => e.sets.every((s) => isEmptySet(toSetEntry(s))))
}
