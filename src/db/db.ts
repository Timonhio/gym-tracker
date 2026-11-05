import Dexie, { type Table } from 'dexie'
import type { Draft } from '../lib/draft'
import type { Exercise, Workout } from '../lib/types'

export interface DraftRecord extends Draft {
  id: 'current'
}

/**
 * Everything lives in the browser's IndexedDB – no backend.
 *  - workouts:  saved trainings (sets are nested inside)
 *  - exercises: only the user's CUSTOM exercises (built-ins live in code)
 *  - drafts:    the training that is currently being entered, so a page
 *               reload on the phone doesn't lose it
 */
class GymDB extends Dexie {
  workouts!: Table<Workout, string>
  exercises!: Table<Exercise, string>
  drafts!: Table<DraftRecord, string>

  constructor() {
    super('gym-tracker')
    this.version(1).stores({
      workouts: 'id, date, createdAt',
      exercises: 'id',
      drafts: 'id',
    })
  }
}

export const db = new GymDB()
