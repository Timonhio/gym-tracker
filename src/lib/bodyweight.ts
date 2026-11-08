import { addDays, diffDays, parseISODate, toISODate } from './dates'
import { rangeStart, type RangeKey } from './stats'
import type { BodyWeightEntry } from './types'

/** Chronological order (oldest first). */
export function sortBodyWeights(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export function latestBodyWeight(entries: BodyWeightEntry[]): BodyWeightEntry | null {
  const sorted = sortBodyWeights(entries)
  return sorted.length ? sorted[sorted.length - 1] : null
}

export function bodyWeightsInRange(entries: BodyWeightEntry[], range: RangeKey, now: Date): BodyWeightEntry[] {
  const start = rangeStart(range, now)
  return sortBodyWeights(entries).filter((e) => start === null || e.date >= start)
}

export interface BodyWeightChange {
  from: BodyWeightEntry
  to: BodyWeightEntry
  /** kg, to - from (rounded to 0.1) */
  delta: number
}

/** Change between the first and the last measurement in the range; null with fewer than two. */
export function bodyWeightChange(entries: BodyWeightEntry[], range: RangeKey, now: Date): BodyWeightChange | null {
  const inR = bodyWeightsInRange(entries, range, now)
  if (inR.length < 2) return null
  const from = inR[0]
  const to = inR[inR.length - 1]
  return { from, to, delta: Math.round((to.kg - from.kg) * 10) / 10 }
}

/**
 * Evenly spaced Y-axis ticks around the data, e.g. 81.6–84.6 kg -> [80, 82, 84, 86].
 * Step is 1, 2 or 5 kg depending on the spread; the range always includes all values.
 */
export function niceWeightTicks(min: number, max: number): number[] {
  const spread = max - min
  const step = spread <= 4 ? 1 : spread <= 10 ? 2 : 5
  const lo = Math.floor((min - 0.25) / step) * step
  const hi = Math.ceil((max + 0.25) / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t)
  return ticks
}

/**
 * Time axis for the body-weight chart: from the start of the range (or the first
 * measurement for "All") up to today, at least one week wide, with a few tick
 * marks that always fall on whole days. Values are local-midnight timestamps.
 */
export function bodyWeightAxis(
  points: BodyWeightEntry[],
  range: RangeKey,
  now: Date,
  maxTicks = 4,
): { domain: [number, number]; ticks: number[] } {
  const end = parseISODate(toISODate(now))
  const startISO = rangeStart(range, now) ?? points[0]?.date ?? toISODate(now)
  let first = parseISODate(startISO)
  if (diffDays(first, end) < 6) first = addDays(end, -6)
  const days = diffDays(first, end)
  const count = Math.min(maxTicks, days + 1)
  const ticks = new Set<number>()
  for (let i = 0; i < count; i++) ticks.add(addDays(first, Math.round((i * days) / Math.max(1, count - 1))).getTime())
  return { domain: [first.getTime(), end.getTime()], ticks: [...ticks] }
}

/** Accepts "82,4" or "82.4"; returns kg or null if not a plausible human weight. */
export function parseBodyWeight(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 20 || n > 400) return null
  return Math.round(n * 10) / 10
}
