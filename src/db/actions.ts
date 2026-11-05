import type { Backup } from '../lib/backup'
import { DEMO_PREFIX, generateDemoWorkouts } from '../lib/demo'
import type { Exercise, Workout } from '../lib/types'
import { db } from './db'

export const saveWorkout = (w: Workout) => db.workouts.put(w)
export const deleteWorkout = (id: string) => db.workouts.delete(id)

export const saveCustomExercise = (e: Exercise) => db.exercises.put({ ...e, custom: true })
export const deleteCustomExercise = (id: string) => db.exercises.delete(id)

/** Replaces ALL data with the contents of a (validated) backup. */
export async function replaceAll(backup: Backup) {
  await db.transaction('rw', db.workouts, db.exercises, db.drafts, async () => {
    await db.workouts.clear()
    await db.exercises.clear()
    await db.drafts.clear()
    await db.workouts.bulkAdd(backup.workouts)
    await db.exercises.bulkAdd(backup.exercises)
  })
}

export async function wipeAll() {
  await db.transaction('rw', db.workouts, db.exercises, db.drafts, async () => {
    await db.workouts.clear()
    await db.exercises.clear()
    await db.drafts.clear()
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
