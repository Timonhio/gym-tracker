import { describe, expect, it } from 'vitest'
import { trainingCalendar } from './calendar'
import type { Workout } from './types'

const w = (date: string, id = date): Workout => ({ id, date, createdAt: 0, entries: [] })
const NOW = new Date(2026, 10, 7) // 7 Nov 2026, a Saturday

describe('trainingCalendar', () => {
  it('shows one month per calendar month from the range start to today', () => {
    const cal = trainingCalendar([], '3m', NOW) // 91 days back = 9 Aug 2026
    expect(cal.months.map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
  })

  it('starts the first month at the range start and ends the current month today', () => {
    const cal = trainingCalendar([], '4w', NOW) // 28 days back = 11 Oct 2026
    expect(cal.months[0].days[0].day).toBe(11)
    expect(cal.months[0].days).toHaveLength(21) // 11–31 Oct
    expect(cal.months[1].days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('aligns weeks to Monday, counted from the first day that is shown', () => {
    const cal = trainingCalendar([], '3m', NOW) // starts Sun 9 Aug; 1 Sep is a Tuesday, 1 Oct a Thursday, 1 Nov a Sunday
    expect(cal.months.map((m) => m.offset)).toEqual([6, 1, 3, 6])
  })

  it('marks training days and counts workouts and days', () => {
    const cal = trainingCalendar([w('2026-11-03', 'a'), w('2026-11-03', 'b'), w('2026-10-20')], '4w', NOW)
    const nov = cal.months[1].days
    expect(nov.find((d) => d.date === '2026-11-03')!.count).toBe(2)
    expect(nov.find((d) => d.date === '2026-11-04')!.count).toBe(0)
    expect(cal.workouts).toBe(3)
    expect(cal.trainingDays).toBe(2)
  })

  it('ignores workouts outside the range', () => {
    const cal = trainingCalendar([w('2026-01-05'), w('2026-11-01')], '4w', NOW)
    expect(cal.workouts).toBe(1)
  })

  it('"All" starts with the first workout, across years', () => {
    const cal = trainingCalendar([w('2025-12-30'), w('2026-02-02')], 'all', NOW)
    expect(cal.months[0].key).toBe('2025-12')
    expect(cal.months[cal.months.length - 1].key).toBe('2026-11')
    expect(cal.months).toHaveLength(12)
    expect(cal.months[0].days.map((d) => d.day)).toEqual([30, 31])
    expect(cal.months[0].days[0].count).toBe(1)
    expect(cal.months[0].offset).toBe(1) // 30 Dec 2025 is a Tuesday
  })

  it('"All" without workouts shows the current month only', () => {
    const cal = trainingCalendar([], 'all', NOW)
    expect(cal.months.map((m) => m.key)).toEqual(['2026-11'])
    expect(cal.workouts).toBe(0)
  })
})
