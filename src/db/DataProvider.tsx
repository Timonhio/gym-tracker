import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { makeLookup, mergeCatalog } from '../lib/exercises'
import { computeSetPRs, type SetPRMap } from '../lib/pr'
import type { BodyWeightEntry, Exercise, ProgressPhoto, Workout } from '../lib/types'
import { db } from './db'

interface DataValue {
  /** All saved workouts, unsorted. */
  workouts: Workout[]
  /** Custom exercises only. */
  custom: Exercise[]
  /** Built-in + custom, sorted by name. */
  catalog: Exercise[]
  lookup: (id: string) => Exercise
  isBodyweight: (id: string) => boolean
  /** PR types per saved set (key: setKey(workoutId, setId)). */
  setPRs: SetPRMap
  /** Body-weight measurements, unsorted. */
  bodyWeights: BodyWeightEntry[]
  /** Progress photos, unsorted. */
  photos: ProgressPhoto[]
}

const DataContext = createContext<DataValue | null>(null)

export function useData(): DataValue {
  const v = useContext(DataContext)
  if (!v) throw new Error('useData must be used inside <DataProvider>')
  return v
}

/** Loads everything from IndexedDB once and keeps it live; derives the PRs. */
export function DataProvider({ children }: { children: ReactNode }) {
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const custom = useLiveQuery(() => db.exercises.toArray(), [])
  const bodyWeights = useLiveQuery(() => db.bodyWeights.toArray(), [])
  const photos = useLiveQuery(() => db.photos.toArray(), [])

  const value = useMemo<DataValue | null>(() => {
    if (!workouts || !custom || !bodyWeights || !photos) return null
    const catalog = mergeCatalog(custom)
    const lookup = makeLookup(catalog)
    const isBodyweight = (id: string) => lookup(id).bodyweight
    return {
      workouts,
      custom,
      catalog,
      lookup,
      isBodyweight,
      setPRs: computeSetPRs(workouts, isBodyweight),
      bodyWeights,
      photos,
    }
  }, [workouts, custom, bodyWeights, photos])

  if (!value) {
    return <div className="grid min-h-dvh place-items-center text-slate-500">Loading…</div>
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
