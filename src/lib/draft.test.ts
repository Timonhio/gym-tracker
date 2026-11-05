import { describe, expect, it } from 'vitest'
import {
  draftToWorkout,
  incompleteSetIds,
  isDraftBlank,
  newDraftEntry,
  parseNumber,
  workoutToDraft,
  type Draft,
} from './draft'
import { BUILTIN_EXERCISES, makeLookup } from './exercises'
import { formatNumber, formatSets } from './format'

const lookup = makeLookup(BUILTIN_EXERCISES)
const isBw = (id: string) => lookup(id).bodyweight

describe('parseNumber', () => {
  it('accepts comma and dot', () => {
    expect(parseNumber('62,5')).toBe(62.5)
    expect(parseNumber('62.5')).toBe(62.5)
    expect(parseNumber(' 8 ')).toBe(8)
  })
  it('rejects empty, negative and garbage', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('-3')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('newDraftEntry', () => {
  it('starts with 3 empty sets', () => {
    const e = newDraftEntry('bankdruecken')
    expect(e.sets).toHaveLength(3)
    expect(new Set(e.sets.map((s) => s.id)).size).toBe(3)
  })
})

describe('draftToWorkout', () => {
  const draft: Draft = {
    date: '2026-03-01',
    entries: [
      {
        exerciseId: 'bankdruecken',
        sets: [
          { id: 'a', reps: '8', weight: '60' },
          { id: 'b', reps: '', weight: '' }, // empty -> ignored
          { id: 'c', reps: '7', weight: '62,5' },
        ],
      },
      { exerciseId: 'latzug', sets: [{ id: 'd', reps: '', weight: '' }] }, // all empty -> dropped
      { exerciseId: 'klimmzuege', sets: [{ id: 'e', reps: '10', weight: '' }] }, // bodyweight ok
    ],
  }
  it('drops empty sets and exercises without valid sets', () => {
    const w = draftToWorkout(draft, 'w1', 1, isBw)
    expect(w.entries.map((e) => e.exerciseId)).toEqual(['bankdruecken', 'klimmzuege'])
    expect(w.entries[0].sets.map((s) => s.id)).toEqual(['a', 'c'])
    expect(w.entries[0].sets[1]).toMatchObject({ reps: 7, weight: 62.5 })
    expect(w.entries[1].sets[0]).toMatchObject({ reps: 10, weight: null })
  })
  it('round-trips through workoutToDraft', () => {
    const w = draftToWorkout(draft, 'w1', 1, isBw)
    const again = draftToWorkout(workoutToDraft(w), 'w1', 1, isBw)
    expect(again).toEqual(w)
  })
})

describe('incompleteSetIds', () => {
  it('finds sets with reps but no weight on weighted exercises only', () => {
    const draft: Draft = {
      date: '2026-03-01',
      entries: [
        { exerciseId: 'bankdruecken', sets: [{ id: 'x', reps: '8', weight: '' }, { id: 'y', reps: '', weight: '' }] },
        { exerciseId: 'klimmzuege', sets: [{ id: 'z', reps: '8', weight: '' }] },
      ],
    }
    expect([...incompleteSetIds(draft, isBw)]).toEqual(['x'])
  })
})

describe('isDraftBlank', () => {
  it('is blank without input', () => {
    expect(isDraftBlank({ date: '2026-03-01', entries: [] })).toBe(true)
    expect(isDraftBlank({ date: '2026-03-01', entries: [newDraftEntry('latzug')] })).toBe(true)
  })
  it('is not blank once something is typed', () => {
    const e = newDraftEntry('latzug')
    e.sets[0].weight = '40'
    expect(isDraftBlank({ date: '2026-03-01', entries: [e] })).toBe(false)
  })
})

describe('formatting', () => {
  it('formats numbers with a decimal comma', () => {
    expect(formatNumber(62.5)).toBe('62,5')
    expect(formatNumber(60)).toBe('60')
  })
  it('formats last-time hints', () => {
    const bench = lookup('bankdruecken')
    const sets = [8, 8, 7].map((reps, i) => ({ id: String(i), reps, weight: 60 }))
    expect(formatSets(sets, bench)).toBe('8 / 8 / 7 × 60 kg')
    expect(formatSets([...sets, { id: 'x', reps: 5, weight: 65 }], bench)).toBe('8 / 8 / 7 × 60 kg · 5 × 65 kg')
    expect(formatSets([{ id: 'e', reps: null, weight: null }], bench)).toBe('')
  })
  it('formats bodyweight and timed sets', () => {
    expect(formatSets([{ id: '1', reps: 10, weight: null }, { id: '2', reps: 8, weight: null }], lookup('klimmzuege'))).toBe(
      '10 / 8 Wdh.',
    )
    expect(formatSets([{ id: '1', reps: 60, weight: null }], lookup('plank'))).toBe('60 Sek.')
  })
})
