import { formatNumber, formatWeight, repsUnit } from '../lib/format'
import type { ExercisePRs } from '../lib/pr'
import type { Exercise } from '../lib/types'

/** "🏆 PR: 85 kg · 1RM ≈ 99 kg" – the current records of one exercise, always visible. */
export function PRLine({ prs, exercise }: { prs: ExercisePRs; exercise: Exercise }) {
  const unit = repsUnit(exercise)
  const parts: string[] = []
  if (prs.weight) parts.push(`${formatWeight(prs.weight.weight)} × ${prs.weight.reps}`)
  if (prs.e1rm) parts.push(`1RM ≈ ${formatWeight(Math.round(prs.e1rm.value * 10) / 10)}`)
  if (prs.bodyweightReps) parts.push(`${prs.bodyweightReps.reps} ${unit} ohne Zusatzgewicht`)

  if (parts.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">🏆 Noch kein PR – leg los!</p>
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer list-none text-amber-700 dark:text-amber-400">
        🏆 PR: <span className="font-semibold">{parts.join(' · ')}</span>
        {prs.repsAtWeight.length > 1 && <span className="ml-1 text-slate-500">▾</span>}
      </summary>
      {prs.repsAtWeight.length > 0 && (
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Meiste {unit} je Gewicht: {prs.repsAtWeight.map((r) => `${r.reps} × ${formatNumber(r.weight)} kg`).join(' · ')}
        </p>
      )}
    </details>
  )
}
