export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Traps',
  'Shoulders',
  'Neck',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'EZ-Bar', 'Bodyweight', 'Other'] as const
export type Equipment = (typeof EQUIPMENT)[number]

export interface Exercise {
  id: string
  name: string
  primary: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment
  /** Weight is optional for these (pull-ups, dips, plank …). */
  bodyweight: boolean
  /** The reps field means seconds (plank). Only changes labels. */
  timed?: boolean
  /** true for user-created exercises (stored in IndexedDB). */
  custom?: boolean
}

export interface SetEntry {
  id: string
  reps: number | null
  weight: number | null
}

export interface WorkoutEntry {
  exerciseId: string
  sets: SetEntry[]
}

export interface Workout {
  id: string
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  /** Unix ms; breaks ties between workouts on the same day. */
  createdAt: number
  /** Custom session name. Missing/empty = the name is generated from the muscles trained. */
  name?: string
  entries: WorkoutEntry[]
}

export type PRType = 'weight' | 'reps' | 'e1rm' | 'bodyweightReps'

/** Occasional body-weight measurement (kg). */
export interface BodyWeightEntry {
  id: string
  date: string
  kg: number
}

/** A progress photo. Both blobs are JPEGs (downscaled in the browser before saving). */
export interface ProgressPhoto {
  id: string
  date: string
  createdAt: number
  note?: string
  full: Blob
  thumb: Blob
}
