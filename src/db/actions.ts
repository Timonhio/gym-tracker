import type { Backup } from '../lib/backup'
import { DEMO_PREFIX, generateDemoWorkouts } from '../lib/demo'
import { dataURLToBlob } from '../lib/image'
import type { Exercise, ProgressPhoto, Workout } from '../lib/types'
import { db } from './db'

export const saveWorkout = (w: Workout) => db.workouts.put(w)
export const deleteWorkout = (id: string) => db.workouts.delete(id)

export const saveCustomExercise = (e: Exercise) => db.exercises.put({ ...e, custom: true })
export const deleteCustomExercise = (id: string) => db.exercises.delete(id)

/** One measurement per day: the date is the id, so logging again the same day overwrites. */
export const saveBodyWeight = (date: string, kg: number) => db.bodyWeights.put({ id: date, date, kg })
export const deleteBodyWeight = (id: string) => db.bodyWeights.delete(id)

export const savePhoto = (p: ProgressPhoto) => db.photos.put(p)
export const deletePhoto = (id: string) => db.photos.delete(id)

const ALL = () => [db.workouts, db.exercises, db.drafts, db.bodyWeights, db.photos] as const

/** Replaces ALL data with the contents of a (validated) backup. */
export async function replaceAll(backup: Backup) {
  const photos: ProgressPhoto[] = backup.photos.map((p) => ({
    id: p.id,
    date: p.date,
    createdAt: p.createdAt,
    ...(p.note ? { note: p.note } : {}),
    full: dataURLToBlob(p.full),
    thumb: dataURLToBlob(p.thumb),
  }))
  await db.transaction('rw', ...ALL(), async () => {
    await Promise.all(ALL().map((t) => t.clear()))
    await db.workouts.bulkAdd(backup.workouts)
    await db.exercises.bulkAdd(backup.exercises)
    await db.bodyWeights.bulkAdd(backup.bodyWeights)
    await db.photos.bulkAdd(photos)
  })
}

export async function wipeAll() {
  await db.transaction('rw', ...ALL(), async () => {
    await Promise.all(ALL().map((t) => t.clear()))
  })
}

/** Adds demo workouts (re-running is safe: same ids are overwritten). */
export async function loadDemo(now: Date = new Date()) {
  const demo = generateDemoWorkouts(now)
  await db.workouts.bulkPut(demo)
  return demo.length
}

export async function removeDemo() {
  const ids = (await db.workouts.toCollection().primaryKeys()).filter((k) => k.startsWith(DEMO_PREFIX))
  await db.workouts.bulkDelete(ids)
  return ids.length
}
