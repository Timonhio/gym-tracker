import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { makeLookup, mergeCatalog } from '../lib/exercises'
import { computeSetPRs, type SetPRMap } from '../lib/pr'
import type { Exercise, Workout } from '../lib/types'
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

  const value = useMemo<DataValue | null>(() => {
    if (!workouts || !custom) return null
    const catalog = mergeCatalog(custom)
    const lookup = makeLookup(catalog)
    const isBodyweight = (id: string) => lookup(id).bodyweight
    return { workouts, custom, catalog, lookup, isBodyweight, setPRs: computeSetPRs(workouts, isBodyweight) }
  }, [workouts, custom])

  if (!value) {
    return <div className="grid min-h-dvh place-items-center text-slate-500">Lade …</div>
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
