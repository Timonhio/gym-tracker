import type { ProgressPhoto } from './types'

export interface PhotoDay {
  date: string
  photos: ProgressPhoto[]
}

/** Photos grouped by day: newest day first, photos within a day in the order they were added. */
export function groupPhotosByDay(photos: ProgressPhoto[]): PhotoDay[] {
  const byDay = new Map<string, ProgressPhoto[]>()
  for (const p of photos) byDay.set(p.date, [...(byDay.get(p.date) ?? []), p])
  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      photos: list.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
    }))
}
