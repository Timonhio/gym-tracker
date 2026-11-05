import { describe, expect, it } from 'vitest'
import { isBackupStale } from './backupReminder'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 2, 11)

describe('isBackupStale', () => {
  it('never nags without data', () => {
    expect(isBackupStale(0, null, NOW)).toBe(false)
  })
  it('waits until there are a few workouts before the first nudge', () => {
    expect(isBackupStale(2, null, NOW)).toBe(false)
    expect(isBackupStale(3, null, NOW)).toBe(true)
  })
  it('nags after 30 days', () => {
    expect(isBackupStale(10, NOW - 29 * DAY, NOW)).toBe(false)
    expect(isBackupStale(10, NOW - 31 * DAY, NOW)).toBe(true)
  })
})
