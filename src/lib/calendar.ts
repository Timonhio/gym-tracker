import { parseISODate, toISODate } from './dates'
import { rangeStart, type RangeKey } from './stats'
import type { Workout } from './types'

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string
  /** Day of the month, 1–31 */
  day: number
  /** Workouts on that day (0 = rest day) */
  count: number
}

export interface CalendarMonth {
  /** "2026-11" */
  key: string
  /** 0 = January */
  month: number
  year: number
  /** Empty cells before the first shown day so that weeks start on Monday (0–6) */
  offset: number
  /** Only days inside the range: the first month starts at the range start, the current month ends today. */
  days: CalendarDay[]
}

export interface TrainingCalendar {
  months: CalendarMonth[]
  /** Workouts inside the range */
  workouts: number
  /** Different days with at least one workout inside the range */
  trainingDays: number
}

/**
 * One block per calendar month from the start of the range up to today, with a
 * count per day (0 = rest day). "All" starts with your first
 * workout; without workouts it shows the current month only.
 */
export function trainingCalendar(workouts: Workout[], range: RangeKey, now: Date): TrainingCalendar {
  const today = toISODate(now)
  const limit = rangeStart(range, now)
  const earliest = workouts.reduce<string | null>((min, w) => (min === null || w.date < min ? w.date : min), null)
  const start = limit ?? earliest ?? today

  const counts = new Map<string, number>()
  let total = 0
  for (const w of workouts) {
    if (w.date < start || w.date > today) continue
    counts.set(w.date, (counts.get(w.date) ?? 0) + 1)
    total++
  }

  const first = parseISODate(start)
  const months: CalendarMonth[] = []
  for (let y = first.getFullYear(), m = first.getMonth(); y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth()); ) {
    const length = new Date(y, m + 1, 0).getDate()
    const days: CalendarDay[] = []
    for (let d = 1; d <= length; d++) {
      const date = toISODate(new Date(y, m, d))
      if (date >= start && date <= today) days.push({ date, day: d, count: counts.get(date) ?? 0 })
    }
    const offset = (new Date(y, m, days[0].day).getDay() + 6) % 7
    months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, month: m, year: y, offset, days })
    if (++m > 11) {
      m = 0
      y++
    }
  }

  return { months, workouts: total, trainingDays: counts.size }
}
