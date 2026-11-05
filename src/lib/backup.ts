import { isISODate } from './dates'
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  type BodyWeightEntry,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type Workout,
} from './types'

/** v1: workouts + exercises. v2 adds body weights, photos and workout names. */
export const BACKUP_VERSION = 2

/** A photo inside the JSON file: both images as data URLs. */
export interface BackupPhoto {
  id: string
  date: string
  createdAt: number
  note?: string
  full: string
  thumb: string
}

export interface Backup {
  app: 'gym-tracker'
  version: number
  exportedAt: string
  /** Custom exercises only – built-ins are part of the app. */
  exercises: Exercise[]
  workouts: Workout[]
  bodyWeights: BodyWeightEntry[]
  photos: BackupPhoto[]
}

export class BackupError extends Error {}

export interface BackupContent {
  workouts: Workout[]
  exercises: Exercise[]
  bodyWeights?: BodyWeightEntry[]
  photos?: BackupPhoto[]
}

export function buildBackup(content: BackupContent, now: Date = new Date()): Backup {
  return {
    app: 'gym-tracker',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    exercises: content.exercises,
    workouts: content.workouts,
    bodyWeights: content.bodyWeights ?? [],
    photos: content.photos ?? [],
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const isNumOrNull = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0)
const isImageDataUrl = (x: unknown): x is string => typeof x === 'string' && x.startsWith('data:image/') && x.includes(';base64,')

function parseExercise(x: unknown, i: number): Exercise {
  if (!isObj(x) || !isStr(x.id) || !isStr(x.name)) throw new BackupError(`Exercise ${i + 1} is invalid.`)
  if (!MUSCLE_GROUPS.includes(x.primary as MuscleGroup)) throw new BackupError(`Exercise “${x.name}”: unknown muscle group.`)
  if (!EQUIPMENT.includes(x.equipment as Equipment)) throw new BackupError(`Exercise “${x.name}”: unknown equipment.`)
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
  const where = `Workout ${i + 1}`
  if (!isObj(x) || !isStr(x.id)) throw new BackupError(`${where} is invalid.`)
  if (!isISODate(x.date)) throw new BackupError(`${where}: invalid date.`)
  if (typeof x.createdAt !== 'number' || !Number.isFinite(x.createdAt)) throw new BackupError(`${where}: invalid timestamp.`)
  if (!Array.isArray(x.entries)) throw new BackupError(`${where}: no exercises.`)
  const name = typeof x.name === 'string' ? x.name.trim().slice(0, 80) : ''
  return {
    id: x.id,
    date: x.date,
    createdAt: x.createdAt,
    ...(name ? { name } : {}),
    entries: x.entries.map((e, j) => {
      if (!isObj(e) || !isStr(e.exerciseId) || !Array.isArray(e.sets)) {
        throw new BackupError(`${where}, exercise ${j + 1} is invalid.`)
      }
      return {
        exerciseId: e.exerciseId,
        sets: e.sets.map((s, k) => {
          if (!isObj(s) || !isStr(s.id) || !isNumOrNull(s.reps) || !isNumOrNull(s.weight)) {
            throw new BackupError(`${where}, exercise ${j + 1}, set ${k + 1} is invalid.`)
          }
          return { id: s.id, reps: s.reps, weight: s.weight }
        }),
      }
    }),
  }
}

function parseBodyWeight(x: unknown, i: number): BodyWeightEntry {
  if (!isObj(x) || !isStr(x.id) || !isISODate(x.date) || typeof x.kg !== 'number' || !(x.kg > 0 && x.kg < 1000)) {
    throw new BackupError(`Body weight entry ${i + 1} is invalid.`)
  }
  return { id: x.id, date: x.date, kg: x.kg }
}

function parsePhoto(x: unknown, i: number): BackupPhoto {
  const where = `Photo ${i + 1}`
  if (!isObj(x) || !isStr(x.id) || !isISODate(x.date)) throw new BackupError(`${where} is invalid.`)
  if (!isImageDataUrl(x.full) || !isImageDataUrl(x.thumb)) throw new BackupError(`${where}: the image data is invalid.`)
  const note = typeof x.note === 'string' ? x.note.trim().slice(0, 200) : ''
  return {
    id: x.id,
    date: x.date,
    createdAt: typeof x.createdAt === 'number' && Number.isFinite(x.createdAt) ? x.createdAt : Date.parse(x.date),
    ...(note ? { note } : {}),
    full: x.full,
    thumb: x.thumb,
  }
}

function uniqueIds(items: { id: string }[], what: string) {
  const ids = new Set<string>()
  for (const it of items) {
    if (ids.has(it.id)) throw new BackupError(`The backup contains duplicate ${what}.`)
    ids.add(it.id)
  }
}

/** Parses and validates a backup file (v1 or v2). Throws BackupError with a readable message. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('This file is not valid JSON.')
  }
  if (!isObj(data) || data.app !== 'gym-tracker') throw new BackupError('This is not a Gym Tracker backup.')
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was created by a newer version of the app.')
  }
  if (!Array.isArray(data.workouts)) throw new BackupError('The backup contains no workouts.')

  const workouts = data.workouts.map(parseWorkout)
  uniqueIds(workouts, 'workouts')
  const exercises = (Array.isArray(data.exercises) ? data.exercises : []).map(parseExercise)
  const bodyWeights = (Array.isArray(data.bodyWeights) ? data.bodyWeights : []).map(parseBodyWeight)
  uniqueIds(bodyWeights, 'body weight entries')
  const photos = (Array.isArray(data.photos) ? data.photos : []).map(parsePhoto)
  uniqueIds(photos, 'photos')

  return {
    app: 'gym-tracker',
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    exercises,
    workouts,
    bodyWeights,
    photos,
  }
}
