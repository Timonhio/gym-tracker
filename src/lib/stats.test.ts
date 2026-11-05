import { describe, expect, it } from 'vitest'
import { generateDemoWorkouts } from './demo'
import { BUILTIN_EXERCISES, makeLookup } from './exercises'
import { computeSetPRs } from './pr'
import {
  exerciseProgress,
  exerciseRanking,
  inRange,
  latestPRs,
  movementBalance,
  rangeStart,
  regionRecency,
  setsByMuscle,
  volumeTrend,
  weekdayCounts,
  weeklyStreak,
  workoutsPerWeek,
  workoutVolume,
} from './stats'
import type { Workout } from './types'

const lookup = makeLookup(BUILTIN_EXERCISES)
const isBw = (id: string) => lookup(id).bodyweight
// Wednesday 2026-03-11
const NOW = new Date(2026, 2, 11, 12, 0, 0)

let n = 0
const wk = (date: string, exerciseId = 'bankdruecken', sets: [number, number | null][] = [[8, 60]], id = `w${++n}`): Workout => ({
  id,
  date,
  createdAt: n,
  entries: [{ exerciseId, sets: sets.map(([reps, weight]) => ({ id: `s${++n}`, reps, weight })) }],
})

describe('ranges', () => {
  it('computes the start of each range', () => {
    expect(rangeStart('4w', NOW)).toBe('2026-02-12')
    expect(rangeStart('all', NOW)).toBeNull()
  })
  it('filters workouts into the range (inclusive) and drops the future', () => {
    const ws = [wk('2026-02-11'), wk('2026-02-12'), wk('2026-03-11'), wk('2026-03-12')]
    expect(inRange(ws, '4w', NOW).map((w) => w.date)).toEqual(['2026-02-12', '2026-03-11'])
    expect(inRange(ws, 'all', NOW)).toHaveLength(3)
  })
})

describe('volume', () => {
  it('sums reps x weight of valid sets only', () => {
    const w = wk('2026-03-01', 'bankdruecken', [[10, 50], [5, 100]])
    expect(workoutVolume(w, isBw)).toBe(1000)
  })
  it('bodyweight sets without weight add nothing', () => {
    expect(workoutVolume(wk('2026-03-01', 'klimmzuege', [[10, null]]), isBw)).toBe(0)
  })
  it('computes the trend against the previous period', () => {
    const ws = [wk('2026-03-01', 'bankdruecken', [[10, 100]]), wk('2026-01-25', 'bankdruecken', [[10, 50]])]
    const t = volumeTrend(ws, '4w', NOW, isBw)
    expect(t.current).toBe(1000)
    expect(t.previous).toBe(500)
    expect(t.changePct).toBe(100)
  })
  it('has no comparison for "all" or an empty previous period', () => {
    const ws = [wk('2026-03-01')]
    expect(volumeTrend(ws, 'all', NOW, isBw).changePct).toBeNull()
    expect(volumeTrend(ws, '4w', NOW, isBw).changePct).toBeNull()
  })
})

describe('workoutsPerWeek', () => {
  it('fills empty weeks with 0 and starts on Mondays', () => {
    const ws = [wk('2026-03-02'), wk('2026-03-04'), wk('2026-02-16')]
    const buckets = workoutsPerWeek(ws, '4w', NOW)
    expect(buckets.every((b) => parseDay(b.weekStart) === 1)).toBe(true) // Monday
    expect(buckets.at(-1)).toEqual({ weekStart: '2026-03-09', count: 0 })
    expect(buckets.find((b) => b.weekStart === '2026-03-02')?.count).toBe(2)
    expect(buckets.find((b) => b.weekStart === '2026-02-23')?.count).toBe(0)
  })
  it('is empty for "all" without workouts', () => {
    expect(workoutsPerWeek([], 'all', NOW)).toEqual([])
  })
})
const parseDay = (iso: string) => new Date(iso + 'T12:00:00').getDay()

describe('weeklyStreak', () => {
  it('counts consecutive weeks, current week optional', () => {
    const ws = [wk('2026-02-24'), wk('2026-03-03')] // weeks of Feb 23 and Mar 2; this week (Mar 9) empty
    expect(weeklyStreak(ws, NOW)).toEqual({ current: 2, longest: 2 })
  })
  it('includes the current week when trained', () => {
    const ws = [wk('2026-03-10'), wk('2026-03-03')]
    expect(weeklyStreak(ws, NOW).current).toBe(2)
  })
  it('breaks after a missed week', () => {
    const ws = [wk('2026-02-10'), wk('2026-03-10')] // gap
    expect(weeklyStreak(ws, NOW)).toEqual({ current: 1, longest: 1 })
    expect(weeklyStreak([wk('2026-02-10')], NOW)).toEqual({ current: 0, longest: 1 })
  })
  it('is 0 without workouts', () => {
    expect(weeklyStreak([], NOW)).toEqual({ current: 0, longest: 0 })
  })
})

describe('weekdayCounts', () => {
  it('starts on Monday', () => {
    expect(weekdayCounts([wk('2026-03-09'), wk('2026-03-09'), wk('2026-03-15')])).toEqual([2, 0, 0, 0, 0, 0, 1])
  })
})

describe('rankings and distribution', () => {
  const ws = [wk('2026-03-01'), wk('2026-03-03'), wk('2026-03-05', 'latzug', [[10, 40], [10, 40]])]
  it('ranks exercises by workouts', () => {
    const r = exerciseRanking(ws, lookup)
    expect(r[0]).toMatchObject({ exerciseId: 'bankdruecken', workouts: 2, sets: 2 })
    expect(r[1]).toMatchObject({ exerciseId: 'latzug', workouts: 1, sets: 2 })
  })
  it('counts sets per primary muscle', () => {
    // Both have 2 sets -> fixed muscle order (Brust before Rücken).
    expect(setsByMuscle(ws, lookup)).toEqual([
      { muscle: 'Brust', sets: 2 },
      { muscle: 'Rücken', sets: 2 },
    ])
  })
  it('ignores invalid sets', () => {
    const w = wk('2026-03-01', 'bankdruecken', [[8, null]])
    expect(exerciseRanking([w], lookup)).toEqual([])
    expect(setsByMuscle([w], lookup)).toEqual([])
  })
  it('balances push and pull', () => {
    const b = movementBalance(ws, lookup)
    expect(b.counts).toMatchObject({ Drücken: 2, Ziehen: 2, Beine: 0 })
    expect(b.pushPullRatio).toBe(1)
    expect(movementBalance([wk('2026-03-01')], lookup).pushPullRatio).toBeNull()
  })
})

describe('regionRecency', () => {
  it('reports days since each region and null for never', () => {
    const ws = [wk('2026-03-01'), wk('2026-02-20', 'kniebeugen')]
    const r = Object.fromEntries(regionRecency(ws, lookup, NOW).map((x) => [x.region, x.days]))
    expect(r.Brust).toBe(10)
    expect(r.Beine).toBe(19)
    expect(r.Rücken).toBeNull()
  })
})

describe('exerciseProgress and latestPRs', () => {
  const ws = [
    wk('2026-03-01', 'bankdruecken', [[8, 60]]),
    wk('2026-03-03', 'bankdruecken', [[8, 60]]), // tie -> no PR
    wk('2026-03-05', 'bankdruecken', [[5, 70], [8, 50]]),
  ]
  const prs = computeSetPRs(ws, isBw)
  it('builds one point per workout with top weight, 1RM and PR flag', () => {
    const p = exerciseProgress(ws, 'bankdruecken', false, prs)
    expect(p.map((x) => x.topWeight)).toEqual([60, 60, 70])
    expect(p.map((x) => x.isPR)).toEqual([true, false, true])
    expect(p[2].e1rm).toBeCloseTo(70 * (1 + 5 / 30))
  })
  it('handles bodyweight progress', () => {
    const w = [wk('2026-03-01', 'klimmzuege', [[8, null]]), wk('2026-03-03', 'klimmzuege', [[10, null]])]
    const p = exerciseProgress(w, 'klimmzuege', true, computeSetPRs(w, isBw))
    expect(p.map((x) => x.maxBodyweightReps)).toEqual([8, 10])
    expect(p.map((x) => x.topWeight)).toEqual([null, null])
  })
  it('lists the newest PRs first, one per exercise per workout', () => {
    const l = latestPRs(ws, prs, lookup, 5)
    expect(l.map((x) => x.date)).toEqual(['2026-03-05', '2026-03-01'])
    expect(l[0]).toMatchObject({ exerciseName: 'Bankdrücken', weight: 70, reps: 5 })
  })
  it('respects the limit', () => {
    expect(latestPRs(ws, prs, lookup, 1)).toHaveLength(1)
  })
})

describe('demo data', () => {
  it('produces a plausible history with PRs and a neglected leg day', () => {
    const demo = generateDemoWorkouts(NOW)
    expect(demo.length).toBeGreaterThan(20)
    expect(demo.every((w) => w.date <= '2026-03-11')).toBe(true)
    expect(new Set(demo.map((w) => w.id)).size).toBe(demo.length)
    expect(computeSetPRs(demo, isBw).size).toBeGreaterThan(10)
    const legs = regionRecency(demo, lookup, NOW).find((r) => r.region === 'Beine')!
    expect(legs.days).toBeGreaterThanOrEqual(10)
  })
})
