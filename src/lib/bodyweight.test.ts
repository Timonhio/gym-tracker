import { describe, expect, it } from 'vitest'
import { bodyWeightChange, bodyWeightsInRange, latestBodyWeight, niceWeightTicks, parseBodyWeight, sortBodyWeights } from './bodyweight'
import type { BodyWeightEntry } from './types'

const NOW = new Date(2026, 2, 11, 12) // 11 Mar 2026
const bw = (date: string, kg: number): BodyWeightEntry => ({ id: date, date, kg })

describe('body weight helpers', () => {
  const entries = [bw('2026-03-01', 81.2), bw('2025-12-01', 84), bw('2026-02-15', 82.5)]

  it('sorts oldest first and finds the latest', () => {
    expect(sortBodyWeights(entries).map((e) => e.date)).toEqual(['2025-12-01', '2026-02-15', '2026-03-01'])
    expect(latestBodyWeight(entries)?.kg).toBe(81.2)
    expect(latestBodyWeight([])).toBeNull()
  })

  it('filters by range', () => {
    expect(bodyWeightsInRange(entries, '4w', NOW).map((e) => e.date)).toEqual(['2026-02-15', '2026-03-01'])
    expect(bodyWeightsInRange(entries, 'all', NOW)).toHaveLength(3)
  })

  it('computes the change between first and last measurement in the range', () => {
    const c = bodyWeightChange(entries, '4w', NOW)
    expect(c?.delta).toBe(-1.3)
    expect(c?.from.date).toBe('2026-02-15')
    expect(bodyWeightChange(entries, 'all', NOW)?.delta).toBe(-2.8)
  })

  it('needs two measurements for a change', () => {
    expect(bodyWeightChange([bw('2026-03-01', 80)], 'all', NOW)).toBeNull()
    expect(bodyWeightChange(entries, '4w', new Date(2026, 5, 1))).toBeNull()
  })

  it('builds evenly spaced axis ticks that include all values', () => {
    expect(niceWeightTicks(82.4, 84.6)).toEqual([82, 83, 84, 85])
    expect(niceWeightTicks(80, 85)).toEqual([78, 80, 82, 84, 86])
    // values that sit exactly on a tick still get a little room above and below
    expect(niceWeightTicks(70, 90)).toEqual([65, 70, 75, 80, 85, 90, 95])
    const t = niceWeightTicks(81.2, 84.6)
    expect(t[0]).toBeLessThanOrEqual(81.2)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(84.6)
  })

  it('parses plausible weights only', () => {
    expect(parseBodyWeight('82,4')).toBe(82.4)
    expect(parseBodyWeight(' 82.46 ')).toBe(82.5)
    expect(parseBodyWeight('')).toBeNull()
    expect(parseBodyWeight('abc')).toBeNull()
    expect(parseBodyWeight('5')).toBeNull()
    expect(parseBodyWeight('900')).toBeNull()
  })
})
