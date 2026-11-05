import { describe, expect, it } from 'vitest'
import { balanceInsights, favoriteWeekday, neglectInsights, volumeInsight } from './insights'
import type { MovementBalance, RegionRecency } from './stats'

const rec = (region: RegionRecency['region'], days: number | null): RegionRecency => ({
  region,
  days,
  lastDate: days === null ? null : '2026-01-01',
})
const bal = (push: number, pull: number, legs = 0): MovementBalance => ({
  counts: { Drücken: push, Ziehen: pull, Beine: legs, Core: 0 },
  pushPullRatio: pull ? push / pull : null,
})

describe('neglectInsights', () => {
  it('says nothing without workouts', () => {
    expect(neglectInsights([rec('Beine', null)], false)).toEqual([])
  })
  it('names regions that were not trained for 7+ days, longest first', () => {
    const r = neglectInsights([rec('Brust', 2), rec('Beine', 12), rec('Rücken', 7), rec('Bauch', null)], true)
    expect(r.map((x) => x.text)).toEqual([
      'Bauch noch nie trainiert.',
      'Beine seit 12 Tagen nicht trainiert.',
      'Rücken seit 7 Tagen nicht trainiert.',
    ])
  })
  it('praises a balanced week', () => {
    const r = neglectInsights([rec('Brust', 1), rec('Beine', 6)], true)
    expect(r).toHaveLength(1)
    expect(r[0].level).toBe('good')
  })
  it('uses the singular for one day', () => {
    expect(neglectInsights([rec('Brust', 1)], true)[0].level).toBe('good')
  })
})

describe('balanceInsights', () => {
  it('flags too much pushing', () => {
    expect(balanceInsights(bal(30, 15))[0]).toMatchObject({ level: 'warn' })
  })
  it('flags too much pulling', () => {
    expect(balanceInsights(bal(10, 20))[0]).toMatchObject({ level: 'warn' })
  })
  it('flags no pulling at all', () => {
    expect(balanceInsights(bal(10, 0))[0].text).toContain('gar nicht')
  })
  it('is happy with a balance', () => {
    expect(balanceInsights(bal(20, 20, 20))[0]).toMatchObject({ level: 'good' })
  })
  it('warns about missing legs only with enough data', () => {
    expect(balanceInsights(bal(20, 20, 2)).some((i) => i.icon === '🦵')).toBe(true)
    expect(balanceInsights(bal(5, 5, 0)).some((i) => i.icon === '🦵')).toBe(false)
  })
  it('is empty without data', () => {
    expect(balanceInsights(bal(0, 0))).toEqual([])
  })
})

describe('volumeInsight', () => {
  it('needs a comparison', () => {
    expect(volumeInsight({ current: 100, previous: null, changePct: null })).toBeNull()
    expect(volumeInsight({ current: 0, previous: 100, changePct: -100 })).toBeNull()
  })
  it('describes up, down and flat', () => {
    expect(volumeInsight({ current: 120, previous: 100, changePct: 20 })?.text).toContain('20 % höher')
    expect(volumeInsight({ current: 80, previous: 100, changePct: -20 })?.text).toContain('20 % niedriger')
    expect(volumeInsight({ current: 101, previous: 100, changePct: 1 })?.level).toBe('info')
  })
})

describe('favoriteWeekday', () => {
  it('picks the most frequent day', () => {
    expect(favoriteWeekday([1, 0, 5, 0, 2, 0, 0])).toEqual({ name: 'Mittwoch', count: 5 })
  })
  it('returns null on ties or no data', () => {
    expect(favoriteWeekday([2, 0, 2, 0, 0, 0, 0])).toBeNull()
    expect(favoriteWeekday([0, 0, 0, 0, 0, 0, 0])).toBeNull()
  })
})
