import { describe, expect, it } from 'vitest'
import {
  applySet,
  computeSetPRs,
  currentPRs,
  emptyState,
  epley1RM,
  evaluateSet,
  isEmptySet,
  isIncompleteSet,
  isValidSet,
  setKey,
} from './pr'
import type { Workout } from './types'

const BENCH = 'bench-press'
const PULLUP = 'pull-ups'
const isBw = (id: string) => id === PULLUP

let n = 0
function workout(
  id: string,
  date: string,
  exerciseId: string,
  sets: [number | null, number | null][], // [reps, weight]
  createdAt = 1000,
): Workout {
  return {
    id,
    date,
    createdAt,
    entries: [
      {
        exerciseId,
        sets: sets.map(([reps, weight]) => ({ id: `s${++n}`, reps, weight })),
      },
    ],
  }
}
const prsOf = (w: Workout, all: Workout[]) => {
  const map = computeSetPRs(all, isBw)
  return w.entries.flatMap((e) => e.sets.map((s) => map.get(setKey(w.id, s.id)) ?? []))
}

describe('epley1RM', () => {
  it('uses w * (1 + reps/30)', () => {
    expect(epley1RM(60, 10)).toBeCloseTo(80)
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 2)
  })
  it('returns the weight itself for a single rep', () => {
    expect(epley1RM(100, 1)).toBe(100)
  })
  it('returns 0 for missing values', () => {
    expect(epley1RM(0, 5)).toBe(0)
    expect(epley1RM(50, 0)).toBe(0)
  })
})

describe('set validity', () => {
  it('detects empty sets', () => {
    expect(isEmptySet({ reps: null, weight: null })).toBe(true)
    expect(isEmptySet({ reps: 0, weight: 0 })).toBe(true)
    expect(isEmptySet({})).toBe(true)
    expect(isEmptySet({ reps: 5, weight: null })).toBe(false)
  })
  it('requires weight for non-bodyweight exercises', () => {
    expect(isValidSet({ reps: 8, weight: null }, false)).toBe(false)
    expect(isValidSet({ reps: 8, weight: 60 }, false)).toBe(true)
  })
  it('allows missing weight for bodyweight exercises', () => {
    expect(isValidSet({ reps: 8, weight: null }, true)).toBe(true)
    expect(isValidSet({ reps: 0, weight: 10 }, true)).toBe(false)
  })
  it('flags partially filled sets as incomplete', () => {
    expect(isIncompleteSet({ reps: 8, weight: null }, false)).toBe(true)
    expect(isIncompleteSet({ reps: null, weight: 60 }, false)).toBe(true)
    expect(isIncompleteSet({ reps: null, weight: null }, false)).toBe(false)
    expect(isIncompleteSet({ reps: 8, weight: 60 }, false)).toBe(false)
  })
})

describe('evaluateSet', () => {
  it('first valid set ever is a weight and 1RM PR', () => {
    expect(evaluateSet(emptyState(), { reps: 8, weight: 60 }, false)).toEqual(['weight', 'e1rm'])
  })
  it('ignores empty and invalid sets', () => {
    expect(evaluateSet(emptyState(), { reps: null, weight: null }, false)).toEqual([])
    expect(evaluateSet(emptyState(), { reps: 8, weight: null }, false)).toEqual([])
    expect(evaluateSet(emptyState(), { reps: 0, weight: 60 }, false)).toEqual([])
  })
  it('equal values are not a PR', () => {
    const s = applySet(emptyState(), { reps: 8, weight: 60 }, false)
    expect(evaluateSet(s, { reps: 8, weight: 60 }, false)).toEqual([])
  })
  it('more reps at the same weight is a reps PR (and 1RM)', () => {
    const s = applySet(emptyState(), { reps: 8, weight: 60 }, false)
    expect(evaluateSet(s, { reps: 9, weight: 60 }, false)).toEqual(['reps', 'e1rm'])
  })
  it('more reps than a heavier earlier set counts as a reps PR', () => {
    const s = applySet(emptyState(), { reps: 5, weight: 80 }, false)
    // 6 reps with 70 kg: not more than 5 reps @ 80 (higher weight) -> 6 > 5 so yes
    expect(evaluateSet(s, { reps: 6, weight: 70 }, false)).toContain('reps')
    // 5 reps with 70 kg: same reps as the heavier set -> no reps PR
    expect(evaluateSet(s, { reps: 5, weight: 70 }, false)).not.toContain('reps')
  })
  it('a lighter weight with fewer reps than a heavier set is no PR at all', () => {
    const s = applySet(emptyState(), { reps: 5, weight: 80 }, false)
    expect(evaluateSet(s, { reps: 4, weight: 70 }, false)).toEqual([])
  })
  it('a heavier weight is a weight PR even with fewer reps, without a reps PR', () => {
    const s = applySet(emptyState(), { reps: 10, weight: 60 }, false)
    expect(evaluateSet(s, { reps: 1, weight: 65 }, false)).toEqual(['weight'])
  })
  it('more reps at a lower weight: reps + 1RM PR, but no weight PR', () => {
    const s = applySet(emptyState(), { reps: 1, weight: 100 }, false) // e1rm 100
    // 90 x 5 -> e1rm 105 > 100; 5 reps > 1 rep @ 100 kg (higher weight)
    expect(evaluateSet(s, { reps: 5, weight: 90 }, false)).toEqual(['reps', 'e1rm'])
  })
  it('heavier but with a lower estimated 1RM is only a weight PR', () => {
    const s = applySet(emptyState(), { reps: 10, weight: 60 }, false) // e1rm 80
    // 70 x 5 -> e1rm 81.67 > 80 -> weight + 1RM (5 reps < 10, so no reps PR)
    expect(evaluateSet(s, { reps: 5, weight: 70 }, false)).toEqual(['weight', 'e1rm'])
    // 65 x 5 -> e1rm 75.8 < 80 -> weight only
    expect(evaluateSet(s, { reps: 5, weight: 65 }, false)).toEqual(['weight'])
  })
  it('bodyweight: most reps is a PR, ties are not', () => {
    let s = emptyState()
    expect(evaluateSet(s, { reps: 8, weight: null }, true)).toEqual(['bodyweightReps'])
    s = applySet(s, { reps: 8, weight: null }, true)
    expect(evaluateSet(s, { reps: 8, weight: null }, true)).toEqual([])
    expect(evaluateSet(s, { reps: 9, weight: 0 }, true)).toEqual(['bodyweightReps'])
  })
  it('bodyweight exercise with added weight uses the weighted PRs', () => {
    const s = applySet(emptyState(), { reps: 10, weight: null }, true)
    expect(evaluateSet(s, { reps: 5, weight: 10 }, true)).toEqual(['weight', 'e1rm'])
  })
  it('does not mutate the old state', () => {
    const s0 = emptyState()
    applySet(s0, { reps: 8, weight: 60 }, false)
    expect(s0).toEqual(emptyState())
  })
})

describe('computeSetPRs', () => {
  it('marks PRs chronologically and ignores ties', () => {
    const w1 = workout('w1', '2026-01-01', BENCH, [[8, 60], [8, 60], [null, null]])
    const w2 = workout('w2', '2026-01-08', BENCH, [[8, 60], [8, 62.5]])
    const all = [w1, w2]
    expect(prsOf(w1, all)[0]).toEqual(['weight', 'e1rm'])
    expect(prsOf(w1, all)[1]).toEqual([]) // identical to set 1
    expect(prsOf(w1, all)[2]).toEqual([]) // empty
    expect(prsOf(w2, all)[0]).toEqual([]) // tie with w1
    expect(prsOf(w2, all)[1]).toEqual(['weight', 'e1rm'])
  })

  it('is independent of the order of the input array', () => {
    const w1 = workout('w1', '2026-01-01', BENCH, [[8, 60]])
    const w2 = workout('w2', '2026-01-08', BENCH, [[8, 65]])
    const a = computeSetPRs([w1, w2], isBw)
    const b = computeSetPRs([w2, w1], isBw)
    expect([...a.entries()]).toEqual([...b.entries()])
  })

  it('uses createdAt to order workouts on the same day', () => {
    const early = workout('w1', '2026-01-01', BENCH, [[5, 80]], 1)
    const late = workout('w2', '2026-01-01', BENCH, [[5, 80]], 2)
    const all = [late, early]
    expect(prsOf(early, all)[0]).toEqual(['weight', 'e1rm'])
    expect(prsOf(late, all)[0]).toEqual([]) // tie, came later
  })

  it('recalculates when an old workout is edited', () => {
    const w1 = workout('w1', '2026-01-01', BENCH, [[5, 100]])
    const w2 = workout('w2', '2026-01-08', BENCH, [[5, 90]])
    expect(prsOf(w2, [w1, w2])[0]).toEqual([])
    // Edit w1: it was actually only 80 kg -> w2 becomes a PR.
    const edited: Workout = { ...w1, entries: [{ ...w1.entries[0], sets: [{ ...w1.entries[0].sets[0], weight: 80 }] }] }
    expect(prsOf(w2, [edited, w2])[0]).toEqual(['weight', 'e1rm'])
  })

  it('recalculates when an old workout is deleted', () => {
    const w1 = workout('w1', '2026-01-01', BENCH, [[5, 100]])
    const w2 = workout('w2', '2026-01-08', BENCH, [[5, 90]])
    expect(prsOf(w2, [w1, w2])[0]).toEqual([])
    expect(prsOf(w2, [w2])[0]).toEqual(['weight', 'e1rm'])
  })

  it('a backdated workout can take the PR from a later one', () => {
    const later = workout('w2', '2026-02-01', BENCH, [[5, 90]])
    const backdated = workout('w3', '2026-01-15', BENCH, [[5, 90]])
    expect(prsOf(later, [later])[0]).toEqual(['weight', 'e1rm'])
    expect(prsOf(later, [later, backdated])[0]).toEqual([])
    expect(prsOf(backdated, [later, backdated])[0]).toEqual(['weight', 'e1rm'])
  })

  it('tracks exercises independently', () => {
    const a = workout('w1', '2026-01-01', BENCH, [[5, 100]])
    const b = workout('w2', '2026-01-02', 'squat', [[5, 60]])
    expect(prsOf(b, [a, b])[0]).toEqual(['weight', 'e1rm'])
  })

  it('handles bodyweight exercises', () => {
    const w1 = workout('w1', '2026-01-01', PULLUP, [[8, null], [8, null], [9, null]])
    const res = prsOf(w1, [w1])
    expect(res[0]).toEqual(['bodyweightReps'])
    expect(res[1]).toEqual([])
    expect(res[2]).toEqual(['bodyweightReps'])
  })

  it('sets within one workout build on each other', () => {
    const w = workout('w1', '2026-01-01', BENCH, [[5, 60], [5, 70], [5, 65]])
    const res = prsOf(w, [w])
    expect(res[0]).toEqual(['weight', 'e1rm'])
    expect(res[1]).toEqual(['weight', 'e1rm'])
    expect(res[2]).toEqual([])
  })

  it('returns an empty map for an empty history', () => {
    expect(computeSetPRs([], isBw).size).toBe(0)
  })
})

describe('currentPRs', () => {
  it('returns nulls for an exercise without data', () => {
    const p = currentPRs([], BENCH, false)
    expect(p.weight).toBeNull()
    expect(p.e1rm).toBeNull()
    expect(p.bodyweightReps).toBeNull()
    expect(p.repsAtWeight).toEqual([])
  })

  it('finds max weight, best 1RM and reps per weight level', () => {
    const w1 = workout('w1', '2026-01-01', BENCH, [[10, 60], [5, 80], [3, 85]])
    const w2 = workout('w2', '2026-01-08', BENCH, [[12, 60], [4, 80]])
    const p = currentPRs([w1, w2], BENCH, false)
    expect(p.weight).toMatchObject({ weight: 85, reps: 3, date: '2026-01-01' })
    expect(p.e1rm?.weight).toBe(85) // 85 x 3 = 93.5 beats 80 x 5 = 93.3 and 60 x 12 = 84
    expect(p.repsAtWeight.map((r) => [r.weight, r.reps])).toEqual([
      [60, 12],
      [80, 5],
      [85, 3],
    ])
  })

  it('drops dominated reps records', () => {
    const w = workout('w1', '2026-01-01', BENCH, [[8, 60], [8, 70]])
    const p = currentPRs([w], BENCH, false)
    expect(p.repsAtWeight.map((r) => [r.weight, r.reps])).toEqual([[70, 8]])
  })

  it('keeps the earliest date on ties', () => {
    const a = workout('w1', '2026-01-01', BENCH, [[5, 80]])
    const b = workout('w2', '2026-01-08', BENCH, [[5, 80]])
    expect(currentPRs([a, b], BENCH, false).weight?.date).toBe('2026-01-01')
  })

  it('bodyweight PR', () => {
    const a = workout('w1', '2026-01-01', PULLUP, [[8, null]])
    const b = workout('w2', '2026-01-08', PULLUP, [[10, null], [7, null]])
    expect(currentPRs([a, b], PULLUP, true).bodyweightReps).toEqual({ reps: 10, date: '2026-01-08' })
  })

  it('ignores invalid sets', () => {
    const w = workout('w1', '2026-01-01', BENCH, [[8, null], [null, null]])
    expect(currentPRs([w], BENCH, false).weight).toBeNull()
  })
})
