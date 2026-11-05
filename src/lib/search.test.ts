import { describe, expect, it } from 'vitest'
import { BUILTIN_EXERCISES } from './exercises'
import { filterExercises, normalize } from './search'

describe('catalog', () => {
  it('has about 50 built-in exercises with unique ids', () => {
    expect(BUILTIN_EXERCISES.length).toBeGreaterThanOrEqual(50)
    expect(new Set(BUILTIN_EXERCISES.map((e) => e.id)).size).toBe(BUILTIN_EXERCISES.length)
  })
  it('covers every muscle group as primary', () => {
    const primaries = new Set(BUILTIN_EXERCISES.map((e) => e.primary))
    expect(primaries.size).toBe(11)
  })
})

describe('filterExercises', () => {
  it('finds by name, ignoring case and umlauts', () => {
    expect(filterExercises(BUILTIN_EXERCISES, 'bankdruecken', null).map((e) => e.id)).toContain('bankdruecken')
    expect(filterExercises(BUILTIN_EXERCISES, 'BANKDRÜCKEN', null).map((e) => e.id)).toContain('bankdruecken')
    expect(filterExercises(BUILTIN_EXERCISES, 'rumaenisches', null).map((e) => e.id)).toContain('rumaenisches-kreuzheben')
  })
  it('requires all words to match', () => {
    const r = filterExercises(BUILTIN_EXERCISES, 'rudern kabel', null)
    expect(r.map((e) => e.id)).toEqual(['rudern-kabel'])
  })
  it('filters by body part, primary muscle first', () => {
    const r = filterExercises(BUILTIN_EXERCISES, '', 'Trizeps')
    expect(r[0].primary).toBe('Trizeps')
    expect(r.every((e) => e.primary === 'Trizeps' || e.secondary.includes('Trizeps'))).toBe(true)
    const firstOther = r.findIndex((e) => e.primary !== 'Trizeps')
    expect(r.slice(firstOther).every((e) => e.primary !== 'Trizeps')).toBe(true)
  })
  it('returns everything for empty query', () => {
    expect(filterExercises(BUILTIN_EXERCISES, '  ', null)).toHaveLength(BUILTIN_EXERCISES.length)
  })
  it('normalizes', () => {
    expect(normalize('Gesäß Größe')).toBe('gesaess groesse')
  })
})
