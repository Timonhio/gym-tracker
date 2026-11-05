const KEY = 'lastBackup'
const STALE_DAYS = 30

export function getLastBackup(): number | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export function markBackupDone(now: number = Date.now()) {
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    /* ignore */
  }
}

/**
 * Should we nudge the user to export a backup? Only if there is data worth
 * saving and the last backup is older than 30 days (or never happened).
 */
export function isBackupStale(workoutCount: number, lastBackup: number | null, now: number = Date.now()): boolean {
  if (workoutCount === 0) return false
  if (lastBackup === null) return workoutCount >= 3
  return now - lastBackup > STALE_DAYS * 86_400_000
}
