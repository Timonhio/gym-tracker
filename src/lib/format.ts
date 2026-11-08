import { isValidSet } from './pr'
import type { Exercise, PRType, SetEntry } from './types'

/** Unique id. crypto.randomUUID only exists in secure contexts, so keep a fallback (LAN dev server). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** 62.5 -> "62.5", 60 -> "60", 12345 -> "12,345" (max. 2 decimals). */
export function formatNumber(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** plural(1, 'set', 'sets') -> "1 set", plural(3, ...) -> "3 sets" */
export function plural(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`
}

export function formatWeight(w: number): string {
  return `${formatNumber(w)} kg`
}

/** Kilograms for big totals: 234700 -> "234.7 t", 800 -> "800 kg". */
export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${formatNumber(Math.round(kg / 100) / 10)} t` : `${formatNumber(Math.round(kg))} kg`
}

export function repsUnit(ex: Pick<Exercise, 'timed'>): string {
  return ex.timed ? 'sec' : 'reps'
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

/** Top set of a session: "80 kg × 8", or "12 reps" when no weight was added. */
export function formatTopSet(t: { weight: number; reps: number }, ex: Pick<Exercise, 'timed'>): string {
  return t.weight > 0 ? `${formatWeight(t.weight)} × ${t.reps}` : `${t.reps} ${repsUnit(ex)}`
}

/** Change to the previous session: "+2.5 kg", "−1 rep", "+2.5 kg · −2 reps"; "=" if identical. */
export function formatTopSetChange(c: { weightDelta: number; repsDelta: number }, ex: Pick<Exercise, 'timed'>): string {
  const sign = (n: number) => (n > 0 ? '+' : '−')
  const parts: string[] = []
  if (c.weightDelta !== 0) parts.push(`${sign(c.weightDelta)}${formatNumber(Math.abs(c.weightDelta))} kg`)
  if (c.repsDelta !== 0) {
    const unit = ex.timed ? 'sec' : Math.abs(c.repsDelta) === 1 ? 'rep' : 'reps'
    parts.push(`${sign(c.repsDelta)}${formatNumber(Math.abs(c.repsDelta))} ${unit}`)
  }
  return parts.length ? parts.join(' · ') : '='
}

export function prLabel(type: PRType): string {
  switch (type) {
    case 'weight':
      return 'Weight'
    case 'reps':
      return 'Reps'
    case 'e1rm':
      return 'Est. 1RM'
    case 'bodyweightReps':
      return 'Reps'
  }
}

/** Toast text, e.g. "New PR! Bench Press: 85 kg". */
export function describePR(
  types: PRType[],
  set: { reps: number | null; weight: number | null },
  ex: Exercise,
): string {
  const reps = set.reps ?? 0
  const weight = set.weight ?? 0
  let detail: string
  if (types.includes('weight')) detail = formatWeight(weight)
  else if (types.includes('reps')) detail = `${reps} ${repsUnit(ex)} at ${formatWeight(weight)}`
  else if (types.includes('bodyweightReps')) detail = `${reps} ${repsUnit(ex)}`
  else detail = `est. 1RM ${formatWeight(weight * (reps === 1 ? 1 : 1 + reps / 30))}`
  return `New PR! ${ex.name}: ${detail}`
}
