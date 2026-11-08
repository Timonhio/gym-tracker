import type { IExerciseData } from 'react-body-highlighter'
import type { MuscleGroup } from './types'

type LibMuscle = IExerciseData['muscles'][number]

/** Our muscle groups -> the shapes of the body model (react-body-highlighter). */
export const LIB_MUSCLES: Record<MuscleGroup, LibMuscle[]> = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back'],
  Traps: ['trapezius'],
  Shoulders: ['front-deltoids', 'back-deltoids'],
  Neck: ['neck'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Forearms: ['forearm'],
  Abs: ['abs', 'obliques'],
  Quads: ['quadriceps', 'adductor'],
  Hamstrings: ['hamstring'],
  Glutes: ['gluteal', 'abductors'],
  Calves: ['calves'],
}

const shapes = (groups: readonly MuscleGroup[]): LibMuscle[] => [...new Set(groups.flatMap((g) => LIB_MUSCLES[g]))]

/**
 * Data for the body model. Frequency picks the color: 2 = primary target
 * (strong orange), 1 = only assisting (soft orange). A shape that is a primary
 * target is never shown as merely assisting.
 */
export function bodyMapData(primary: readonly MuscleGroup[], secondary: readonly MuscleGroup[]): IExerciseData[] {
  const p = shapes(primary)
  const s = shapes(secondary).filter((m) => !p.includes(m))
  const data: IExerciseData[] = []
  if (p.length) data.push({ name: 'primary', muscles: p, frequency: 2 })
  if (s.length) data.push({ name: 'assisting', muscles: s, frequency: 1 })
  return data
}
