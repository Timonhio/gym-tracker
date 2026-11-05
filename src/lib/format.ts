import { isValidSet } from './pr'
import type { Exercise, PRType, SetEntry } from './types'

/** Unique id. crypto.randomUUID only exists in secure contexts, so keep a fallback (LAN dev server). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** 62.5 -> "62,5", 60 -> "60" (German decimal comma, max. 2 decimals). */
export function formatNumber(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

/** plural(1, 'Satz', 'Sätze') -> "1 Satz", plural(3, ...) -> "3 Sätze" */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function formatWeight(w: number): string {
  return `${formatNumber(w)} kg`
}

export function repsUnit(ex: Pick<Exercise, 'timed'>): string {
  return ex.timed ? 'Sek.' : 'Wdh.'
}

/** Sets of one exercise as a compact string: "8 / 8 / 7 × 60 kg · 5 × 65 kg". */
export function formatSets(sets: SetEntry[], ex: Exercise): string {
  const groups: { weight: number; reps: number[] }[] = []
  for (const s of sets) {
    if (!isValidSet(s, ex.bodyweight)) continue
    const weight = s.weight ?? 0
    const last = groups[groups.length - 1]
    if (last && last.weight === weight) last.reps.push(s.reps as number)
    else groups.push({ weight, reps: [s.reps as number] })
  }
  return groups
    .map((g) => {
      const reps = g.reps.join(' / ')
      return g.weight > 0 ? `${reps} × ${formatWeight(g.weight)}` : `${reps} ${repsUnit(ex)}`
    })
    .join(' · ')
}

export function prLabel(type: PRType): string {
  switch (type) {
    case 'weight':
      return 'Gewicht'
    case 'reps':
      return 'Wiederholungen'
    case 'e1rm':
      return 'Geschätztes 1RM'
    case 'bodyweightReps':
      return 'Wiederholungen'
  }
}

/** Toast text, e.g. "Neuer PR! Bankdrücken: 85 kg". */
export function describePR(
  types: PRType[],
  set: { reps: number | null; weight: number | null },
  ex: Exercise,
): string {
  const reps = set.reps ?? 0
  const weight = set.weight ?? 0
  let detail: string
  if (types.includes('weight')) detail = formatWeight(weight)
  else if (types.includes('reps')) detail = `${reps} ${repsUnit(ex)} bei ${formatWeight(weight)}`
  else if (types.includes('bodyweightReps')) detail = `${reps} ${repsUnit(ex)}`
  else detail = `geschätztes 1RM ${formatWeight(weight * (reps === 1 ? 1 : 1 + reps / 30))}`
  return `Neuer PR! ${ex.name}: ${detail}`
}
