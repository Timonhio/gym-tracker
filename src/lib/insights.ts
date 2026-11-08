import { WEEKDAYS } from './dates'
import { formatNumber, plural } from './format'
import type { MovementBalance, RegionRecency, VolumeTrend } from './stats'

export interface Insight {
  /** "warn" = something to act on, "good" = positive, "info" = neutral fact */
  level: 'warn' | 'good' | 'info'
  text: string
}

/** Days without training before a body region counts as neglected. */
export const NEGLECT_DAYS = 7

/** Small add-on regions that are trained now and then; no nagging about them. */
const NEGLECT_EXEMPT: string[] = ['Traps', 'Neck']

/** "Legs not trained for 12 days" – up to 3, longest pause first. */
export function neglectInsights(recency: RegionRecency[], hasAnyWorkout: boolean): Insight[] {
  if (!hasAnyWorkout) return []
  const stale = recency
    .filter((r) => !NEGLECT_EXEMPT.includes(r.region))
    .filter((r) => r.days === null || r.days >= NEGLECT_DAYS)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
    .slice(0, 3)
  if (stale.length === 0) {
    return [{ level: 'good', text: `Every body region trained within the last ${NEGLECT_DAYS} days.` }]
  }
  return stale.map((r) => ({
    level: 'warn' as const,
    text: r.days === null ? `${r.region}: never trained.` : `${r.region}: not trained for ${plural(r.days, 'day', 'days')}.`,
  }))
}

/** Push vs. pull and legs share of the sets. */
export function balanceInsights(b: MovementBalance): Insight[] {
  const { Push: push, Pull: pull, Legs: legs } = b.counts
  const out: Insight[] = []
  if (push + pull > 0) {
    const text = `${push} push sets : ${pull} pull sets`
    if (pull === 0) out.push({ level: 'warn', text: `${text} – no pulling at all. Rows and pull-ups protect your shoulders.` })
    else if (push / pull > 1.25) out.push({ level: 'warn', text: `${text} – more pulling (rows, pulldowns) would balance things out.` })
    else if (push / pull < 0.8) out.push({ level: 'warn', text: `${text} – more pushing would balance things out.` })
    else out.push({ level: 'good', text: `${text} – nicely balanced.` })
  }
  const total = push + pull + legs
  if (total >= 20 && legs / total < 0.25) {
    out.push({ level: 'warn', text: `Only ${Math.round((legs / total) * 100)}% of your sets go to legs.` })
  }
  return out
}

export function volumeInsight(t: VolumeTrend): Insight | null {
  if (t.current === 0 || t.changePct === null) return null
  const pct = Math.round(t.changePct)
  if (Math.abs(pct) < 3) return { level: 'info', text: 'Training volume about the same as in the previous period.' }
  return pct > 0
    ? { level: 'good', text: `Training volume is ${formatNumber(pct)}% higher than in the previous period.` }
    : { level: 'info', text: `Training volume is ${formatNumber(Math.abs(pct))}% lower than in the previous period.` }
}

/** Most frequent training day (Monday-first counts); null on a tie for first or no data. */
export function favoriteWeekday(counts: number[]): { name: string; count: number } | null {
  const max = Math.max(...counts)
  if (max === 0) return null
  const idx = counts.indexOf(max)
  if (counts.lastIndexOf(max) !== idx) return null
  return { name: WEEKDAYS[idx], count: max }
}
