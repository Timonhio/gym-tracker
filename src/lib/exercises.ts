import type { Equipment, Exercise, MuscleGroup } from './types'

function ex(
  id: string,
  name: string,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: Equipment,
  opts: { bodyweight?: boolean; timed?: boolean } = {},
): Exercise {
  return {
    id,
    name,
    primary,
    secondary,
    equipment,
    bodyweight: opts.bodyweight ?? equipment === 'Bodyweight',
    ...(opts.timed ? { timed: true } : {}),
  }
}

/** Built-in suggestion list. IDs are stable – workouts reference them. */
export const BUILTIN_EXERCISES: Exercise[] = [
  // Chest
  ex('bench-press', 'Bench Press', 'Chest', ['Triceps', 'Shoulders'], 'Barbell'),
  ex('incline-bench-press', 'Incline Bench Press', 'Chest', ['Shoulders', 'Triceps'], 'Barbell'),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'Chest', ['Triceps', 'Shoulders'], 'Dumbbell'),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Chest', ['Shoulders', 'Triceps'], 'Dumbbell'),
  ex('dumbbell-fly', 'Dumbbell Fly', 'Chest', ['Shoulders'], 'Dumbbell'),
  ex('cable-crossover', 'Cable Crossover', 'Chest', ['Shoulders'], 'Cable'),
  ex('chest-press-machine', 'Chest Press Machine', 'Chest', ['Triceps', 'Shoulders'], 'Machine'),
  ex('dips', 'Dips', 'Chest', ['Triceps', 'Shoulders'], 'Bodyweight'),
  ex('push-ups', 'Push-Ups', 'Chest', ['Triceps', 'Shoulders'], 'Bodyweight'),

  // Back
  ex('deadlift', 'Deadlift', 'Back', ['Glutes', 'Hamstrings', 'Forearms'], 'Barbell'),
  ex('pull-ups', 'Pull-Ups', 'Back', ['Biceps', 'Forearms'], 'Bodyweight'),
  ex('lat-pulldown', 'Lat Pulldown', 'Back', ['Biceps'], 'Cable'),
  ex('barbell-row', 'Barbell Row', 'Back', ['Biceps', 'Forearms'], 'Barbell'),
  ex('seated-cable-row', 'Seated Cable Row', 'Back', ['Biceps'], 'Cable'),
  ex('one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'Back', ['Biceps'], 'Dumbbell'),
  ex('t-bar-row', 'T-Bar Row', 'Back', ['Biceps'], 'Barbell'),
  ex('back-extension', 'Back Extension', 'Back', ['Glutes', 'Hamstrings'], 'Bodyweight'),

  // Shoulders
  ex('overhead-press', 'Overhead Press', 'Shoulders', ['Triceps'], 'Barbell'),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', ['Triceps'], 'Dumbbell'),
  ex('lateral-raise', 'Lateral Raise', 'Shoulders', [], 'Dumbbell'),
  ex('front-raise', 'Front Raise', 'Shoulders', ['Chest'], 'Dumbbell'),
  ex('face-pulls', 'Face Pulls', 'Shoulders', ['Back'], 'Cable'),
  ex('reverse-fly', 'Reverse Fly', 'Shoulders', ['Back'], 'Machine'),
  ex('upright-row', 'Upright Row', 'Shoulders', ['Biceps'], 'Barbell'),
  ex('shrugs', 'Shrugs', 'Shoulders', ['Back', 'Forearms'], 'Dumbbell'),

  // Biceps
  ex('dumbbell-curl', 'Dumbbell Curl', 'Biceps', ['Forearms'], 'Dumbbell'),
  ex('barbell-curl', 'Barbell Curl', 'Biceps', ['Forearms'], 'Barbell'),
  ex('hammer-curl', 'Hammer Curl', 'Biceps', ['Forearms'], 'Dumbbell'),
  ex('preacher-curl', 'Preacher Curl', 'Biceps', [], 'EZ-Bar'),
  ex('cable-curl', 'Cable Curl', 'Biceps', ['Forearms'], 'Cable'),

  // Triceps
  ex('triceps-pushdown', 'Triceps Pushdown', 'Triceps', [], 'Cable'),
  ex('skull-crushers', 'Skull Crushers', 'Triceps', [], 'EZ-Bar'),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', 'Triceps', [], 'Dumbbell'),
  ex('close-grip-bench-press', 'Close-Grip Bench Press', 'Triceps', ['Chest', 'Shoulders'], 'Barbell'),

  // Forearms
  ex('wrist-curl', 'Wrist Curl', 'Forearms', [], 'Barbell'),
  ex('farmers-walk', "Farmer's Walk", 'Forearms', ['Shoulders', 'Abs'], 'Dumbbell'),

  // Abs
  ex('plank', 'Plank', 'Abs', ['Shoulders'], 'Bodyweight', { timed: true }),
  ex('crunches', 'Crunches', 'Abs', [], 'Bodyweight'),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Abs', ['Forearms'], 'Bodyweight'),
  ex('cable-crunch', 'Cable Crunch', 'Abs', [], 'Cable'),
  ex('russian-twist', 'Russian Twist', 'Abs', [], 'Other', { bodyweight: true }),

  // Quads
  ex('squat', 'Squat', 'Quads', ['Glutes', 'Hamstrings'], 'Barbell'),
  ex('front-squat', 'Front Squat', 'Quads', ['Glutes', 'Abs'], 'Barbell'),
  ex('leg-press', 'Leg Press', 'Quads', ['Glutes', 'Hamstrings'], 'Machine'),
  ex('leg-extension', 'Leg Extension', 'Quads', [], 'Machine'),
  ex('lunges', 'Lunges', 'Quads', ['Glutes', 'Hamstrings'], 'Dumbbell'),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Quads', ['Glutes'], 'Dumbbell'),
  ex('hack-squat', 'Hack Squat', 'Quads', ['Glutes'], 'Machine'),

  // Hamstrings
  ex('romanian-deadlift', 'Romanian Deadlift', 'Hamstrings', ['Glutes', 'Back'], 'Barbell'),
  ex('lying-leg-curl', 'Lying Leg Curl', 'Hamstrings', ['Calves'], 'Machine'),
  ex('seated-leg-curl', 'Seated Leg Curl', 'Hamstrings', ['Calves'], 'Machine'),

  // Glutes
  ex('hip-thrust', 'Hip Thrust', 'Glutes', ['Hamstrings'], 'Barbell'),
  ex('cable-kickback', 'Cable Kickback', 'Glutes', ['Hamstrings'], 'Cable'),
  ex('hip-abduction', 'Hip Abduction Machine', 'Glutes', [], 'Machine'),

  // Calves
  ex('standing-calf-raise', 'Standing Calf Raise', 'Calves', [], 'Machine'),
  ex('seated-calf-raise', 'Seated Calf Raise', 'Calves', [], 'Machine'),
]

/** Built-ins plus the user's custom exercises, sorted by name. */
export function mergeCatalog(custom: Exercise[]): Exercise[] {
  return [...BUILTIN_EXERCISES, ...custom.map((e) => ({ ...e, custom: true }))].sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )
}

/** Placeholder for exercises that were deleted but are still referenced by old workouts. */
export function unknownExercise(id: string): Exercise {
  return {
    id,
    name: 'Deleted exercise',
    primary: 'Chest',
    secondary: [],
    equipment: 'Other',
    bodyweight: false,
  }
}

export function makeLookup(catalog: Exercise[]) {
  const map = new Map(catalog.map((e) => [e.id, e]))
  return (id: string): Exercise => map.get(id) ?? unknownExercise(id)
}

// ---- Groupings used by the dashboard and session summary -----------------

export const REGIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_OF: Record<MuscleGroup, Region> = {
  Chest: 'Chest',
  Back: 'Back',
  Shoulders: 'Shoulders',
  Biceps: 'Arms',
  Triceps: 'Arms',
  Forearms: 'Arms',
  Abs: 'Core',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Calves: 'Legs',
}

export type Movement = 'Push' | 'Pull' | 'Legs' | 'Core'

export const MOVEMENT_OF: Record<MuscleGroup, Movement> = {
  Chest: 'Push',
  Shoulders: 'Push',
  Triceps: 'Push',
  Back: 'Pull',
  Biceps: 'Pull',
  Forearms: 'Pull',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Calves: 'Legs',
  Abs: 'Core',
}
