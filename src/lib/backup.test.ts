import { describe, expect, it } from 'vitest'
import { BackupError, buildBackup, parseBackup } from './backup'
import { generateDemoWorkouts } from './demo'
import type { Exercise, Workout } from './types'

const custom: Exercise = {
  id: 'c1',
  name: 'Meine Übung',
  primary: 'Brust',
  secondary: ['Trizeps'],
  equipment: 'Kabel',
  bodyweight: false,
  custom: true,
}
const workout: Workout = {
  id: 'w1',
  date: '2026-03-01',
  createdAt: 123,
  entries: [{ exerciseId: 'c1', sets: [{ id: 's1', reps: 8, weight: 60 }] }],
}

describe('backup', () => {
  it('round-trips', () => {
    const json = JSON.stringify(buildBackup([workout], [custom], new Date('2026-03-02T10:00:00Z')))
    const parsed = parseBackup(json)
    expect(parsed.workouts).toEqual([workout])
    expect(parsed.exercises).toEqual([custom])
    expect(parsed.exportedAt).toBe('2026-03-02T10:00:00.000Z')
  })

  it('round-trips a large demo history', () => {
    const demo = generateDemoWorkouts(new Date('2026-03-01T12:00:00'))
    const parsed = parseBackup(JSON.stringify(buildBackup(demo, [])))
    expect(parsed.workouts).toEqual(demo)
  })

  it.each([
    ['not json', 'nope'],
    ['wrong app', JSON.stringify({ app: 'other', version: 1, workouts: [] })],
    ['newer version', JSON.stringify({ app: 'gym-tracker', version: 99, workouts: [] })],
    ['missing workouts', JSON.stringify({ app: 'gym-tracker', version: 1 })],
    [
      'bad date',
      JSON.stringify({ app: 'gym-tracker', version: 1, workouts: [{ ...workout, date: '01.03.2026' }] }),
    ],
    [
      'impossible date',
      JSON.stringify({ app: 'gym-tracker', version: 1, workouts: [{ ...workout, date: '2026-02-31' }] }),
    ],
    [
      'negative reps',
      JSON.stringify({
        app: 'gym-tracker',
        version: 1,
        workouts: [{ ...workout, entries: [{ exerciseId: 'c1', sets: [{ id: 's', reps: -1, weight: 5 }] }] }],
      }),
    ],
    ['duplicate ids', JSON.stringify({ app: 'gym-tracker', version: 1, workouts: [workout, workout] })],
  ])('rejects %s', (_name, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError)
  })

  it('drops unknown fields and invalid secondary muscles', () => {
    const dirty = {
      app: 'gym-tracker',
      version: 1,
      workouts: [],
      exercises: [{ ...custom, secondary: ['Trizeps', 'Flügel'], evil: 1 }],
    }
    const parsed = parseBackup(JSON.stringify(dirty))
    expect(parsed.exercises[0].secondary).toEqual(['Trizeps'])
    expect(parsed.exercises[0]).not.toHaveProperty('evil')
  })
})
