import { describe, expect, it } from 'vitest'
import { BackupError, buildBackup, parseBackup, type BackupPhoto } from './backup'
import { generateDemoWorkouts } from './demo'
import type { BodyWeightEntry, Exercise, Workout } from './types'

const custom: Exercise = {
  id: 'c1',
  name: 'My exercise',
  primary: 'Chest',
  secondary: ['Triceps'],
  equipment: 'Cable',
  bodyweight: false,
  custom: true,
}
const workout: Workout = {
  id: 'w1',
  date: '2026-03-01',
  createdAt: 123,
  entries: [{ exerciseId: 'c1', sets: [{ id: 's1', reps: 8, weight: 60 }] }],
}
const weight: BodyWeightEntry = { id: '2026-03-01', date: '2026-03-01', kg: 82.4 }
const photo: BackupPhoto = {
  id: 'p1',
  date: '2026-03-01',
  createdAt: 5,
  note: 'front',
  full: 'data:image/jpeg;base64,AAAA',
  thumb: 'data:image/jpeg;base64,BBBB',
}

const wrap = (extra: object) => JSON.stringify({ app: 'gym-tracker', version: 2, workouts: [], ...extra })

describe('backup', () => {
  it('round-trips everything', () => {
    const named = { ...workout, name: 'Push Day' }
    const json = JSON.stringify(
      buildBackup({ workouts: [named], exercises: [custom], bodyWeights: [weight], photos: [photo] }, new Date('2026-03-02T10:00:00Z')),
    )
    const parsed = parseBackup(json)
    expect(parsed.workouts).toEqual([named])
    expect(parsed.exercises).toEqual([custom])
    expect(parsed.bodyWeights).toEqual([weight])
    expect(parsed.photos).toEqual([photo])
    expect(parsed.exportedAt).toBe('2026-03-02T10:00:00.000Z')
  })

  it('round-trips a large demo history', () => {
    const demo = generateDemoWorkouts(new Date('2026-03-01T12:00:00'))
    const parsed = parseBackup(JSON.stringify(buildBackup({ workouts: demo, exercises: [] })))
    expect(parsed.workouts).toEqual(demo)
  })

  it('still reads version 1 backups (no weights, photos or names)', () => {
    const v1 = JSON.stringify({ app: 'gym-tracker', version: 1, workouts: [workout], exercises: [custom] })
    const parsed = parseBackup(v1)
    expect(parsed.workouts).toEqual([workout])
    expect(parsed.bodyWeights).toEqual([])
    expect(parsed.photos).toEqual([])
  })

  it.each([
    ['not json', 'nope'],
    ['wrong app', JSON.stringify({ app: 'other', version: 1, workouts: [] })],
    ['newer version', JSON.stringify({ app: 'gym-tracker', version: 99, workouts: [] })],
    ['missing workouts', JSON.stringify({ app: 'gym-tracker', version: 2 })],
    ['bad date', wrap({ workouts: [{ ...workout, date: '01.03.2026' }] })],
    ['impossible date', wrap({ workouts: [{ ...workout, date: '2026-02-31' }] })],
    [
      'negative reps',
      wrap({ workouts: [{ ...workout, entries: [{ exerciseId: 'c1', sets: [{ id: 's', reps: -1, weight: 5 }] }] }] }),
    ],
    ['duplicate workout ids', wrap({ workouts: [workout, workout] })],
    ['implausible body weight', wrap({ bodyWeights: [{ ...weight, kg: -5 }] })],
    ['body weight with bad date', wrap({ bodyWeights: [{ ...weight, date: 'yesterday' }] })],
    ['duplicate body weight ids', wrap({ bodyWeights: [weight, weight] })],
    ['photo without image data', wrap({ photos: [{ ...photo, full: 'http://evil.example/x.jpg' }] })],
    ['photo with non-image data', wrap({ photos: [{ ...photo, thumb: 'data:text/html;base64,AAAA' }] })],
    ['duplicate photo ids', wrap({ photos: [photo, photo] })],
  ])('rejects %s', (_name, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError)
  })

  it('drops unknown fields and invalid secondary muscles', () => {
    const parsed = parseBackup(wrap({ exercises: [{ ...custom, secondary: ['Triceps', 'Wings'], evil: 1 }] }))
    expect(parsed.exercises[0].secondary).toEqual(['Triceps'])
    expect(parsed.exercises[0]).not.toHaveProperty('evil')
  })

  it('ignores blank workout names and caps long ones', () => {
    const parsed = parseBackup(wrap({ workouts: [{ ...workout, name: '   ' }, { ...workout, id: 'w2', name: 'x'.repeat(200) }] }))
    expect(parsed.workouts[0]).not.toHaveProperty('name')
    expect(parsed.workouts[1].name).toHaveLength(80)
  })
})
