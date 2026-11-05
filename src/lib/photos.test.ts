import { describe, expect, it } from 'vitest'
import { groupPhotosByDay } from './photos'
import type { ProgressPhoto } from './types'

const photo = (id: string, date: string, createdAt: number): ProgressPhoto => ({
  id,
  date,
  createdAt,
  full: new Blob(),
  thumb: new Blob(),
})

describe('groupPhotosByDay', () => {
  it('returns nothing for no photos', () => {
    expect(groupPhotosByDay([])).toEqual([])
  })

  it('groups by day, newest day first', () => {
    const days = groupPhotosByDay([photo('a', '2026-03-01', 1), photo('b', '2026-03-10', 2), photo('c', '2026-03-01', 3)])
    expect(days.map((d) => d.date)).toEqual(['2026-03-10', '2026-03-01'])
    expect(days[1].photos.map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('keeps photos of one day in the order they were added', () => {
    const days = groupPhotosByDay([photo('late', '2026-03-01', 50), photo('early', '2026-03-01', 10)])
    expect(days[0].photos.map((p) => p.id)).toEqual(['early', 'late'])
  })

  it('sorts a photo added later for an older date into that older day', () => {
    const days = groupPhotosByDay([photo('new', '2026-03-10', 100), photo('backfilled', '2026-02-01', 200)])
    expect(days.map((d) => d.date)).toEqual(['2026-03-10', '2026-02-01'])
  })
})
