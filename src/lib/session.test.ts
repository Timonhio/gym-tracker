import { describe, expect, it } from 'vitest'
import { BUILTIN_EXERCISES, makeLookup } from './exercises'
import { entriesFromDraft, entriesFromWorkout, sessionTargets, workoutDisplayName } from './session'
import type { Workout } from './types'

const lookup = makeLookup(BUILTIN_EXERCISES)
const e = (exerciseId: string, sets = 3) => ({ exerciseId, sets })

describe('sessionTargets', () => {
  it('names the session after the regions, alphabetically', () => {
    // Shoulders, triceps (Arms) and chest -> "Arms · Chest · Shoulders"
    const t = sessionTargets([e('bench-press'), e('overhead-press'), e('triceps-pushdown')], lookup)
    expect(t.name).toBe('Arms · Chest · Shoulders')
    expect(t.regions).toEqual(['Arms', 'Chest', 'Shoulders'])
  })

  it('returns the placeholder name without exercises', () => {
    expect(sessionTargets([], lookup).name).toBe('New session')
    expect(sessionTargets([e('bench-press', 0)], lookup).name).toBe('New session')
  })

  it('only names the three most trained regions but lists all of them', () => {
    const t = sessionTargets(
      [e('bench-press', 5), e('barbell-row', 4), e('overhead-press', 3), e('dumbbell-curl', 1)],
      lookup,
    )
    expect(t.name).toBe('Back · Chest · Shoulders') // Arms (1 set) is the 4th
    expect(t.regions).toEqual(['Arms', 'Back', 'Chest', 'Shoulders'])
  })

  it('calls five or more regions a full body session', () => {
    const t = sessionTargets(
      [e('bench-press'), e('barbell-row'), e('overhead-press'), e('dumbbell-curl'), e('squat')],
      lookup,
    )
    expect(t.name).toBe('Full body')
  })

  it('splits primary and assisting muscles', () => {
    const t = sessionTargets([e('bench-press')], lookup)
    expect(t.primary).toEqual(['Chest'])
    expect(t.secondary.sort()).toEqual(['Shoulders', 'Triceps'])
  })

  it('a muscle that is primary elsewhere is not listed as assisting', () => {
    const t = sessionTargets([e('bench-press'), e('triceps-pushdown')], lookup)
    expect(t.primary.sort()).toEqual(['Chest', 'Triceps'])
    expect(t.secondary).toEqual(['Shoulders'])
  })

  it('breaks ties by the fixed region order', () => {
    const t = sessionTargets([e('squat', 3), e('bench-press', 3), e('barbell-row', 3), e('plank', 3)], lookup)
    // 4 regions with equal weight -> all four named? no, only top 3 by region order: Chest, Back, Legs
    expect(t.name).toBe('Back · Chest · Legs')
  })
})

describe('entries helpers', () => {
  const w: Workout = {
    id: 'w',
    date: '2026-03-01',
    createdAt: 1,
    entries: [
      { exerciseId: 'bench-press', sets: [{ id: 'a', reps: 8, weight: 60 }, { id: 'b', reps: null, weight: null }] },
      { exerciseId: 'squat', sets: [{ id: 'c', reps: 5, weight: null }] }, // invalid: weighted exercise without weight
    ],
  }
  it('counts only valid sets of a saved workout and drops empty exercises', () => {
    expect(entriesFromWorkout(w, lookup)).toEqual([{ exerciseId: 'bench-press', sets: 1 }])
  })
  it('counts all set rows of a draft', () => {
    expect(
      entriesFromDraft({
        name: '',
        date: '2026-03-01',
        entries: [{ exerciseId: 'bench-press', sets: [{ id: '1', reps: '', weight: '' }, { id: '2', reps: '', weight: '' }] }],
      }),
    ).toEqual([{ exerciseId: 'bench-press', sets: 2 }])
  })
  it('prefers a custom workout name over the generated one', () => {
    expect(workoutDisplayName(w, lookup)).toBe('Chest')
    expect(workoutDisplayName({ ...w, name: '  Push Day ' }, lookup)).toBe('Push Day')
    expect(workoutDisplayName({ ...w, name: '   ' }, lookup)).toBe('Chest')
  })
})
