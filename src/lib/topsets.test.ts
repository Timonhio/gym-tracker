import { describe, expect, it } from 'vitest'
import { BUILTIN_EXERCISES, REGION_OF, makeLookup } from './exercises'
import { formatTopSet, formatTopSetChange } from './format'
import { computeSetPRs } from './pr'
import { exerciseTopSets, movementBalance, setsByMuscle } from './stats'
import type { Workout } from './types'

const lookup = makeLookup(BUILTIN_EXERCISES)
const none = new Map()

let n = 0
const wk = (date: string, exerciseId: string, sets: [number, number | null][], id = `w${++n}`): Workout => ({
  id,
  date,
  createdAt: n,
  entries: [{ exerciseId, sets: sets.map(([reps, weight]) => ({ id: `s${++n}`, reps, weight })) }],
})

describe('exerciseTopSets', () => {
  it('takes the heaviest weight of the session and the most reps at that weight', () => {
    const w = wk('2026-03-01', 'bench-press', [
      [12, 60],
      [8, 80],
      [6, 80],
      [9, 80],
      [15, 50],
    ])
    const [t] = exerciseTopSets([w], 'bench-press', false, none)
    expect(t).toMatchObject({ weight: 80, reps: 9, date: '2026-03-01', change: null })
  })

  it('returns one point per workout in date order and ignores other exercises', () => {
    const ws = [wk('2026-03-08', 'bench-press', [[5, 85]]), wk('2026-03-01', 'bench-press', [[8, 80]]), wk('2026-03-04', 'squat', [[5, 100]])]
    expect(exerciseTopSets(ws, 'bench-press', false, none).map((t) => t.date)).toEqual(['2026-03-01', '2026-03-08'])
  })

  it('skips invalid sets and sessions without any valid set', () => {
    const ws = [wk('2026-03-01', 'bench-press', [[0, 80]]), wk('2026-03-02', 'bench-press', [[5, null]]), wk('2026-03-03', 'bench-press', [[5, 70]])]
    expect(exerciseTopSets(ws, 'bench-press', false, none)).toHaveLength(1)
  })

  it('compares with the previous session: weight first, then reps', () => {
    const ws = [
      wk('2026-03-01', 'bench-press', [[8, 80]]),
      wk('2026-03-08', 'bench-press', [[9, 80]]), // same weight, +1 rep
      wk('2026-03-15', 'bench-press', [[5, 82.5]]), // heavier, fewer reps -> up
      wk('2026-03-22', 'bench-press', [[8, 80]]), // lighter -> down
      wk('2026-03-29', 'bench-press', [[8, 80]]), // identical
    ]
    const t = exerciseTopSets(ws, 'bench-press', false, none)
    expect(t[1].change).toEqual({ direction: 'up', weightDelta: 0, repsDelta: 1 })
    expect(t[2].change).toEqual({ direction: 'up', weightDelta: 2.5, repsDelta: -4 })
    expect(t[3].change).toEqual({ direction: 'down', weightDelta: -2.5, repsDelta: 3 })
    expect(t[4].change).toEqual({ direction: 'same', weightDelta: 0, repsDelta: 0 })
  })

  it('works for bodyweight exercises (weight 0 = just reps) and added weight', () => {
    const ws = [wk('2026-03-01', 'pull-ups', [[8, null], [10, null]]), wk('2026-03-08', 'pull-ups', [[10, null], [6, 10]])]
    const t = exerciseTopSets(ws, 'pull-ups', true, none)
    expect(t[0]).toMatchObject({ weight: 0, reps: 10 })
    expect(t[1]).toMatchObject({ weight: 10, reps: 6 })
    expect(t[1].change?.direction).toBe('up')
  })

  it('flags sessions that contained a PR', () => {
    const ws = [wk('2026-03-01', 'bench-press', [[8, 80]]), wk('2026-03-08', 'bench-press', [[8, 80]])]
    const prs = computeSetPRs(ws, (id) => lookup(id).bodyweight)
    expect(exerciseTopSets(ws, 'bench-press', false, prs).map((t) => t.isPR)).toEqual([true, false])
  })
})

describe('top set formatting', () => {
  const bench = lookup('bench-press')
  const plank = lookup('plank')
  it('shows weight × reps or just reps', () => {
    expect(formatTopSet({ weight: 82.5, reps: 8 }, bench)).toBe('82.5 kg × 8')
    expect(formatTopSet({ weight: 0, reps: 12 }, lookup('push-ups'))).toBe('12 reps')
    expect(formatTopSet({ weight: 0, reps: 60 }, plank)).toBe('60 sec')
  })
  it('describes the change', () => {
    expect(formatTopSetChange({ weightDelta: 2.5, repsDelta: 0 }, bench)).toBe('+2.5 kg')
    expect(formatTopSetChange({ weightDelta: 0, repsDelta: -1 }, bench)).toBe('−1 rep')
    expect(formatTopSetChange({ weightDelta: 5, repsDelta: -2 }, bench)).toBe('+5 kg · −2 reps')
    expect(formatTopSetChange({ weightDelta: 0, repsDelta: 0 }, bench)).toBe('=')
  })
})

describe('traps and neck', () => {
  it('counts every shrug for the traps only, never for back or shoulders', () => {
    const shrugs = BUILTIN_EXERCISES.filter((e) => /shrug/i.test(e.name))
    expect(shrugs.length).toBeGreaterThanOrEqual(3)
    for (const e of shrugs) {
      expect(e.primary).toBe('Traps')
      expect(e.secondary).not.toContain('Back')
      expect(e.secondary).not.toContain('Shoulders')
    }
  })

  it('counts neck exercises for the neck only', () => {
    const neck = BUILTIN_EXERCISES.filter((e) => e.primary === 'Neck')
    expect(neck.length).toBeGreaterThanOrEqual(2)
    for (const e of neck) expect(e.secondary).toEqual([])
    expect(REGION_OF.Neck).toBe('Neck')
    expect(REGION_OF.Traps).toBe('Traps')
  })

  it('does not add shrug sets to the back and keeps the neck out of push/pull', () => {
    const ws = [wk('2026-03-01', 'shrugs', [[12, 30], [12, 30]]), wk('2026-03-02', 'neck-flexion', [[15, 5]])]
    expect(setsByMuscle(ws, lookup)).toEqual([
      { muscle: 'Traps', sets: 2 },
      { muscle: 'Neck', sets: 1 },
    ])
    expect(movementBalance(ws, lookup).counts).toEqual({ Push: 0, Pull: 2, Legs: 0, Core: 0 })
  })
})
