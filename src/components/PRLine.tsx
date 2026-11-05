import { formatNumber, formatWeight, repsUnit } from '../lib/format'
import type { ExercisePRs } from '../lib/pr'
import type { Exercise } from '../lib/types'

/** "PR 85 kg × 5 · 1RM ≈ 99 kg" – the current records of one exercise, always visible. */
export function PRLine({ prs, exercise }: { prs: ExercisePRs; exercise: Exercise }) {
  const unit = repsUnit(exercise)
  const parts: string[] = []
  if (prs.weight) parts.push(`${formatWeight(prs.weight.weight)} × ${prs.weight.reps}`)
  if (prs.e1rm) parts.push(`1RM ≈ ${formatWeight(Math.round(prs.e1rm.value * 10) / 10)}`)
  if (prs.bodyweightReps) parts.push(`${prs.bodyweightReps.reps} ${unit} bodyweight`)

  if (parts.length === 0) {
    return <p className="text-sm text-slate-500">No PR yet</p>
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer list-none text-slate-500">
        <span className="mr-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">PR</span>
        <span className="font-medium text-slate-900 dark:text-white">{parts.join(' · ')}</span>
        {prs.repsAtWeight.length > 1 && <span className="ml-1.5">▾</span>}
      </summary>
      {prs.repsAtWeight.length > 0 && (
        <p className="mt-2 text-slate-500">
          Most {unit} per weight: {prs.repsAtWeight.map((r) => `${r.reps} × ${formatNumber(r.weight)} kg`).join(' · ')}
        </p>
      )}
    </details>
  )
}
