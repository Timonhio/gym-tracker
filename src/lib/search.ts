import type { Exercise, MuscleGroup } from './types'

/** Lower-case and strip accents: "Rücken" matches "rucken", "ruecken" is handled below. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Filters the catalog by search text (every word must match name, muscle or
 * equipment) and optionally by body part (primary OR secondary muscle).
 * Exercises whose PRIMARY muscle matches come first.
 */
export function filterExercises(catalog: Exercise[], query: string, group: MuscleGroup | null): Exercise[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = catalog.filter((e) => {
    if (group && e.primary !== group && !e.secondary.includes(group)) return false
    const hay = normalize(`${e.name} ${e.primary} ${e.secondary.join(' ')} ${e.equipment}`)
    return words.every((w) => hay.includes(w))
  })
  if (!group) return matches
  return [...matches.filter((e) => e.primary === group), ...matches.filter((e) => e.primary !== group)]
}
