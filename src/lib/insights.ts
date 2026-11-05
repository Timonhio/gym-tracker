import { formatNumber } from './format'
import { WEEKDAYS_DE } from './dates'
import type { MovementBalance, RegionRecency, VolumeTrend } from './stats'

export interface Insight {
  icon: string
  /** "warn" = something to act on, "good" = positive, "info" = neutral fact */
  level: 'warn' | 'good' | 'info'
  text: string
}

/** Days without training before a body region counts as neglected. */
export const NEGLECT_DAYS = 7

/** "Beine seit 12 Tagen nicht trainiert" – up to 3, longest pause first. */
export function neglectInsights(recency: RegionRecency[], hasAnyWorkout: boolean): Insight[] {
  if (!hasAnyWorkout) return []
  const stale = recency
    .filter((r) => r.days === null || r.days >= NEGLECT_DAYS)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
    .slice(0, 3)
  if (stale.length === 0) {
    return [{ icon: '✅', level: 'good', text: `Alle Körperregionen in den letzten ${NEGLECT_DAYS} Tagen trainiert.` }]
  }
  return stale.map((r) => ({
    icon: '⏰',
    level: 'warn' as const,
    text:
      r.days === null
        ? `${r.region} noch nie trainiert.`
        : `${r.region} seit ${r.days} ${r.days === 1 ? 'Tag' : 'Tagen'} nicht trainiert.`,
  }))
}

/** Push vs. pull and legs share of the sets. */
export function balanceInsights(b: MovementBalance): Insight[] {
  const { Drücken: push, Ziehen: pull, Beine: legs } = b.counts
  const out: Insight[] = []
  if (push + pull > 0) {
    const text = `${push} Sätze Drücken : ${pull} Sätze Ziehen`
    if (pull === 0) out.push({ icon: '⚖️', level: 'warn', text: `${text} – du ziehst gar nicht. Rudern und Klimmzüge schützen die Schultern.` })
    else if (push / pull > 1.25) out.push({ icon: '⚖️', level: 'warn', text: `${text} – mehr Ziehen (Rudern, Latzug) würde die Balance verbessern.` })
    else if (push / pull < 0.8) out.push({ icon: '⚖️', level: 'warn', text: `${text} – mehr Drücken würde die Balance verbessern.` })
    else out.push({ icon: '⚖️', level: 'good', text: `${text} – schön ausgewogen.` })
  }
  const upperLower = push + pull + legs
  if (upperLower >= 20 && legs / upperLower < 0.25) {
    out.push({ icon: '🦵', level: 'warn', text: `Nur ${Math.round((legs / upperLower) * 100)} % deiner Sätze gehen in die Beine.` })
  }
  return out
}

export function volumeInsight(t: VolumeTrend): Insight | null {
  if (t.current === 0) return null
  if (t.changePct === null) return null
  const pct = Math.round(t.changePct)
  if (Math.abs(pct) < 3) return { icon: '➡️', level: 'info', text: 'Trainingsvolumen etwa wie im Zeitraum davor.' }
  return pct > 0
    ? { icon: '📈', level: 'good', text: `Trainingsvolumen ${formatNumber(pct)} % höher als im Zeitraum davor.` }
    : { icon: '📉', level: 'info', text: `Trainingsvolumen ${formatNumber(Math.abs(pct))} % niedriger als im Zeitraum davor.` }
}

/** Most frequent training day (Monday-first counts); null on a tie for first or no data. */
export function favoriteWeekday(counts: number[]): { name: string; count: number } | null {
  const max = Math.max(...counts)
  if (max === 0) return null
  const idx = counts.indexOf(max)
  if (counts.lastIndexOf(max) !== idx) return null
  return { name: WEEKDAYS_DE[idx], count: max }
}
