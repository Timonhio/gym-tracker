export const MUSCLE_GROUPS = [
  'Brust',
  'Rücken',
  'Schultern',
  'Bizeps',
  'Trizeps',
  'Unterarme',
  'Bauch',
  'Quadrizeps',
  'Beinbeuger',
  'Gesäß',
  'Waden',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EQUIPMENT = [
  'Langhantel',
  'Kurzhantel',
  'Kabel',
  'Maschine',
  'SZ-Stange',
  'Körpergewicht',
  'Sonstiges',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

export interface Exercise {
  id: string
  name: string
  primary: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment
  /** Weight is optional for these (pull-ups, dips, plank …). */
  bodyweight: boolean
  /** Reps field means seconds (plank). Only changes labels. */
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
  entries: WorkoutEntry[]
}

export type PRType = 'weight' | 'reps' | 'e1rm' | 'bodyweightReps'
