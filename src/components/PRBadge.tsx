import { prLabel } from '../lib/format'
import type { PRType } from '../lib/types'

/** 🏆 shown next to a set that was a personal record when it was performed. */
export function PRBadge({ types, className = '' }: { types: PRType[]; className?: string }) {
  const text = 'New PR: ' +[...new Set(types.map(prLabel))].join(', ')
  return (
    <span className={`select-none ${className}`} title={text} aria-label={text} role="img">
      🏆
    </span>
  )
}
