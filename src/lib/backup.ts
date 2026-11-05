import { isISODate } from './dates'
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type MuscleGroup, type Workout } from './types'

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'gym-tracker'
  version: number
  exportedAt: string
  /** Custom exercises only – built-ins are part of the app. */
  exercises: Exercise[]
  workouts: Workout[]
}

export class BackupError extends Error {}

export function buildBackup(workouts: Workout[], customExercises: Exercise[], now: Date = new Date()): Backup {
  return {
    app: 'gym-tracker',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    exercises: customExercises,
    workouts,
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const isNumOrNull = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0)

function parseExercise(x: unknown, i: number): Exercise {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name)) throw new BackupError(`Übung ${i + 1} ist ungültig.`)
  if (!MUSCLE_GROUPS.includes(x.primary as MuscleGroup)) throw new BackupError(`Übung „${x.name}“: unbekannte Muskelgruppe.`)
  if (!EQUIPMENT.includes(x.equipment as Equipment)) throw new BackupError(`Übung „${x.name}“: unbekanntes Equipment.`)
  const secondary = Array.isArray(x.secondary)
    ? (x.secondary.filter((m) => MUSCLE_GROUPS.includes(m as MuscleGroup)) as MuscleGroup[])
    : []
  return {
    id: x.id,
    name: x.name.trim(),
    primary: x.primary as MuscleGroup,
    secondary,
    equipment: x.equipment as Equipment,
    bodyweight: x.bodyweight === true,
    ...(x.timed === true ? { timed: true } : {}),
    custom: true,
  }
}

function parseWorkout(x: unknown, i: number): Workout {
  const where = `Training ${i + 1}`
  if (!isObj(x) || !isStr(x.id)) throw new BackupError(`${where} ist ungültig.`)
  if (!isISODate(x.date)) throw new BackupError(`${where}: ungültiges Datum.`)
  if (typeof x.createdAt !== 'number' || !Number.isFinite(x.createdAt)) throw new BackupError(`${where}: ungültiger Zeitstempel.`)
  if (!Array.isArray(x.entries)) throw new BackupError(`${where}: keine Übungen.`)
  return {
    id: x.id,
    date: x.date,
    createdAt: x.createdAt,
    entries: x.entries.map((e, j) => {
      if (!isObj(e) || !isStr(e.exerciseId) || !Array.isArray(e.sets)) {
        throw new BackupError(`${where}, Übung ${j + 1} ist ungültig.`)
      }
      return {
        exerciseId: e.exerciseId,
        sets: e.sets.map((s, k) => {
          if (!isObj(s) || !isStr(s.id) || !isNumOrNull(s.reps) || !isNumOrNull(s.weight)) {
            throw new BackupError(`${where}, Übung ${j + 1}, Satz ${k + 1} ist ungültig.`)
          }
          return { id: s.id, reps: s.reps, weight: s.weight }
        }),
      }
    }),
  }
}

/** Parses and validates a backup file. Throws BackupError with a German message. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('Die Datei ist kein gültiges JSON.')
  }
  if (!isObj(data) || data.app !== 'gym-tracker') throw new BackupError('Das ist keine Gym-Tracker-Sicherung.')
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('Die Sicherung stammt aus einer neueren App-Version.')
  }
  if (!Array.isArray(data.workouts)) throw new BackupError('Die Sicherung enthält keine Trainings.')

  const workouts = data.workouts.map(parseWorkout)
  const ids = new Set<string>()
  for (const w of workouts) {
    if (ids.has(w.id)) throw new BackupError('Die Sicherung enthält doppelte Trainings.')
    ids.add(w.id)
  }
  const exercises = (Array.isArray(data.exercises) ? data.exercises : []).map(parseExercise)
  return {
    app: 'gym-tracker',
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    exercises,
    workouts,
  }
}
