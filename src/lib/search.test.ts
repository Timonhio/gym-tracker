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
  it('finds by name, ignoring case', () => {
    expect(filterExercises(BUILTIN_EXERCISES, 'bench press', null).map((e) => e.id)).toContain('bench-press')
    expect(filterExercises(BUILTIN_EXERCISES, 'BENCH PRESS', null).map((e) => e.id)).toContain('bench-press')
    expect(filterExercises(BUILTIN_EXERCISES, 'romanian', null).map((e) => e.id)).toContain('romanian-deadlift')
  })
  it('requires all words to match', () => {
    const r = filterExercises(BUILTIN_EXERCISES, 'row cable', null)
    expect(r.map((e) => e.id)).toEqual(['seated-cable-row'])
  })
  it('filters by body part, primary muscle first', () => {
    const r = filterExercises(BUILTIN_EXERCISES, '', 'Triceps')
    expect(r[0].primary).toBe('Triceps')
    expect(r.every((e) => e.primary === 'Triceps' || e.secondary.includes('Triceps'))).toBe(true)
    const firstOther = r.findIndex((e) => e.primary !== 'Triceps')
    expect(r.slice(firstOther).every((e) => e.primary !== 'Triceps')).toBe(true)
  })
  it('returns everything for empty query', () => {
    expect(filterExercises(BUILTIN_EXERCISES, '  ', null)).toHaveLength(BUILTIN_EXERCISES.length)
  })
  it('normalizes', () => {
    expect(normalize('Gesäß Größe')).toBe('gesaess groesse')
  })
})
