import Dexie, { type Table } from 'dexie'
import type { Draft } from '../lib/draft'
import type { BodyWeightEntry, Exercise, ProgressPhoto, Workout } from '../lib/types'

export interface DraftRecord extends Draft {
  id: 'current'
}

/**
 * Everything lives in the browser's IndexedDB – no backend.
 *  - workouts:    saved trainings (sets are nested inside)
 *  - exercises:   only the user's CUSTOM exercises (built-ins live in code)
 *  - drafts:      the training that is currently being entered, so a page
 *                 reload on the phone doesn't lose it
 *  - bodyWeights: occasional body-weight measurements (one per day, id = date)
 *  - photos:      progress photos (downscaled JPEG blobs)
 */
class GymDB extends Dexie {
  workouts!: Table<Workout, string>
  exercises!: Table<Exercise, string>
  drafts!: Table<DraftRecord, string>
  bodyWeights!: Table<BodyWeightEntry, string>
  photos!: Table<ProgressPhoto, string>

  constructor() {
    super('gym-tracker')
    this.version(1).stores({
      workouts: 'id, date, createdAt',
      exercises: 'id',
      drafts: 'id',
    })
    // v2 adds body weight and photos; existing data is untouched.
    this.version(2).stores({
      workouts: 'id, date, createdAt',
      exercises: 'id',
      drafts: 'id',
      bodyWeights: 'id, date',
      photos: 'id, date',
    })
  }
}

export const db = new GymDB()
