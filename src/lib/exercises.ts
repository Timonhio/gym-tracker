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
    bodyweight: opts.bodyweight ?? equipment === 'Körpergewicht',
    ...(opts.timed ? { timed: true } : {}),
  }
}

/** Built-in suggestion list. IDs are stable – workouts reference them. */
export const BUILTIN_EXERCISES: Exercise[] = [
  // Brust
  ex('bankdruecken', 'Bankdrücken', 'Brust', ['Trizeps', 'Schultern'], 'Langhantel'),
  ex('schraegbankdruecken', 'Schrägbankdrücken', 'Brust', ['Schultern', 'Trizeps'], 'Langhantel'),
  ex('kh-bankdruecken', 'Kurzhantel-Bankdrücken', 'Brust', ['Trizeps', 'Schultern'], 'Kurzhantel'),
  ex('kh-schraegbankdruecken', 'Kurzhantel-Schrägbankdrücken', 'Brust', ['Schultern', 'Trizeps'], 'Kurzhantel'),
  ex('fliegende', 'Fliegende', 'Brust', ['Schultern'], 'Kurzhantel'),
  ex('cable-crossover', 'Cable Crossover', 'Brust', ['Schultern'], 'Kabel'),
  ex('brustpresse', 'Brustpresse', 'Brust', ['Trizeps', 'Schultern'], 'Maschine'),
  ex('dips', 'Dips', 'Brust', ['Trizeps', 'Schultern'], 'Körpergewicht'),
  ex('liegestuetze', 'Liegestütze', 'Brust', ['Trizeps', 'Schultern'], 'Körpergewicht'),

  // Rücken
  ex('kreuzheben', 'Kreuzheben', 'Rücken', ['Gesäß', 'Beinbeuger', 'Unterarme'], 'Langhantel'),
  ex('klimmzuege', 'Klimmzüge', 'Rücken', ['Bizeps', 'Unterarme'], 'Körpergewicht'),
  ex('latzug', 'Latzug', 'Rücken', ['Bizeps'], 'Kabel'),
  ex('rudern-langhantel', 'Rudern (Langhantel)', 'Rücken', ['Bizeps', 'Unterarme'], 'Langhantel'),
  ex('rudern-kabel', 'Rudern (Kabel)', 'Rücken', ['Bizeps'], 'Kabel'),
  ex('kh-rudern', 'Einarmiges Kurzhantelrudern', 'Rücken', ['Bizeps'], 'Kurzhantel'),
  ex('tbar-rudern', 'T-Bar-Rudern', 'Rücken', ['Bizeps'], 'Langhantel'),
  ex('rueckenstrecker', 'Rückenstrecker', 'Rücken', ['Gesäß', 'Beinbeuger'], 'Körpergewicht'),

  // Schultern
  ex('schulterdruecken', 'Schulterdrücken', 'Schultern', ['Trizeps'], 'Langhantel'),
  ex('kh-schulterdruecken', 'Kurzhantel-Schulterdrücken', 'Schultern', ['Trizeps'], 'Kurzhantel'),
  ex('seitheben', 'Seitheben', 'Schultern', [], 'Kurzhantel'),
  ex('frontheben', 'Frontheben', 'Schultern', ['Brust'], 'Kurzhantel'),
  ex('face-pulls', 'Face Pulls', 'Schultern', ['Rücken'], 'Kabel'),
  ex('reverse-flys', 'Reverse Flys', 'Schultern', ['Rücken'], 'Maschine'),
  ex('aufrechtes-rudern', 'Aufrechtes Rudern', 'Schultern', ['Bizeps'], 'Langhantel'),
  ex('shrugs', 'Shrugs', 'Schultern', ['Rücken', 'Unterarme'], 'Kurzhantel'),

  // Bizeps
  ex('bizepscurls', 'Bizepscurls', 'Bizeps', ['Unterarme'], 'Kurzhantel'),
  ex('langhantelcurls', 'Langhantelcurls', 'Bizeps', ['Unterarme'], 'Langhantel'),
  ex('hammercurls', 'Hammercurls', 'Bizeps', ['Unterarme'], 'Kurzhantel'),
  ex('preacher-curls', 'Preacher Curls', 'Bizeps', [], 'SZ-Stange'),
  ex('kabelcurls', 'Kabelcurls', 'Bizeps', ['Unterarme'], 'Kabel'),

  // Trizeps
  ex('trizepsdruecken', 'Trizepsdrücken', 'Trizeps', [], 'Kabel'),
  ex('skull-crushers', 'Skull Crushers', 'Trizeps', [], 'SZ-Stange'),
  ex('ueberkopf-trizeps', 'Überkopf-Trizepsstrecken', 'Trizeps', [], 'Kurzhantel'),
  ex('enges-bankdruecken', 'Enges Bankdrücken', 'Trizeps', ['Brust', 'Schultern'], 'Langhantel'),

  // Unterarme
  ex('handgelenkcurls', 'Handgelenkcurls', 'Unterarme', [], 'Langhantel'),
  ex('farmers-walk', "Farmer's Walk", 'Unterarme', ['Schultern', 'Bauch'], 'Kurzhantel'),

  // Bauch
  ex('plank', 'Plank', 'Bauch', ['Schultern'], 'Körpergewicht', { timed: true }),
  ex('crunches', 'Crunches', 'Bauch', [], 'Körpergewicht'),
  ex('haengendes-beinheben', 'Hängendes Beinheben', 'Bauch', ['Unterarme'], 'Körpergewicht'),
  ex('cable-crunch', 'Cable Crunch', 'Bauch', [], 'Kabel'),
  ex('russian-twist', 'Russian Twist', 'Bauch', [], 'Sonstiges', { bodyweight: true }),

  // Quadrizeps
  ex('kniebeugen', 'Kniebeugen', 'Quadrizeps', ['Gesäß', 'Beinbeuger'], 'Langhantel'),
  ex('frontkniebeugen', 'Frontkniebeugen', 'Quadrizeps', ['Gesäß', 'Bauch'], 'Langhantel'),
  ex('beinpresse', 'Beinpresse', 'Quadrizeps', ['Gesäß', 'Beinbeuger'], 'Maschine'),
  ex('beinstrecker', 'Beinstrecker', 'Quadrizeps', [], 'Maschine'),
  ex('ausfallschritte', 'Ausfallschritte', 'Quadrizeps', ['Gesäß', 'Beinbeuger'], 'Kurzhantel'),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Quadrizeps', ['Gesäß'], 'Kurzhantel'),
  ex('hackenschmidt', 'Hackenschmidt-Kniebeuge', 'Quadrizeps', ['Gesäß'], 'Maschine'),

  // Beinbeuger
  ex('rumaenisches-kreuzheben', 'Rumänisches Kreuzheben', 'Beinbeuger', ['Gesäß', 'Rücken'], 'Langhantel'),
  ex('beinbeuger-liegend', 'Beinbeuger (liegend)', 'Beinbeuger', ['Waden'], 'Maschine'),
  ex('beinbeuger-sitzend', 'Beinbeuger (sitzend)', 'Beinbeuger', ['Waden'], 'Maschine'),

  // Gesäß
  ex('hip-thrust', 'Hip Thrust', 'Gesäß', ['Beinbeuger'], 'Langhantel'),
  ex('kabel-kickbacks', 'Kabel-Kickbacks', 'Gesäß', ['Beinbeuger'], 'Kabel'),
  ex('abduktoren', 'Abduktorenmaschine', 'Gesäß', [], 'Maschine'),

  // Waden
  ex('wadenheben-stehend', 'Wadenheben (stehend)', 'Waden', [], 'Maschine'),
  ex('wadenheben-sitzend', 'Wadenheben (sitzend)', 'Waden', [], 'Maschine'),
]

/** Built-ins plus the user's custom exercises, sorted by name. */
export function mergeCatalog(custom: Exercise[]): Exercise[] {
  return [...BUILTIN_EXERCISES, ...custom.map((e) => ({ ...e, custom: true }))].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  )
}

/** Placeholder for exercises that were deleted but are still referenced by old workouts. */
export function unknownExercise(id: string): Exercise {
  return {
    id,
    name: 'Gelöschte Übung',
    primary: 'Brust',
    secondary: [],
    equipment: 'Sonstiges',
    bodyweight: false,
  }
}

export function makeLookup(catalog: Exercise[]) {
  const map = new Map(catalog.map((e) => [e.id, e]))
  return (id: string): Exercise => map.get(id) ?? unknownExercise(id)
}

// ---- Groupings used by the dashboard -------------------------------------

export const REGIONS = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Bauch'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_OF: Record<MuscleGroup, Region> = {
  Brust: 'Brust',
  Rücken: 'Rücken',
  Schultern: 'Schultern',
  Bizeps: 'Arme',
  Trizeps: 'Arme',
  Unterarme: 'Arme',
  Bauch: 'Bauch',
  Quadrizeps: 'Beine',
  Beinbeuger: 'Beine',
  Gesäß: 'Beine',
  Waden: 'Beine',
}

export type Movement = 'Drücken' | 'Ziehen' | 'Beine' | 'Core'

export const MOVEMENT_OF: Record<MuscleGroup, Movement> = {
  Brust: 'Drücken',
  Schultern: 'Drücken',
  Trizeps: 'Drücken',
  Rücken: 'Ziehen',
  Bizeps: 'Ziehen',
  Unterarme: 'Ziehen',
  Quadrizeps: 'Beine',
  Beinbeuger: 'Beine',
  Gesäß: 'Beine',
  Waden: 'Beine',
  Bauch: 'Core',
}
