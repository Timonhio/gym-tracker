import { formatShortDate } from '../lib/dates'
import type { DraftEntry } from '../lib/draft'
import { formatSets, repsUnit } from '../lib/format'
import type { LastEntry } from '../lib/history'
import type { ExercisePRs } from '../lib/pr'
import type { Exercise, PRType } from '../lib/types'
import { PRBadge } from './PRBadge'
import { PRLine } from './PRLine'
import { PlusIcon, TrashIcon, XIcon } from './icons'

interface Props {
  index: number
  entry: DraftEntry
  exercise: Exercise
  prs: ExercisePRs
  last: LastEntry | null
  /** PR types per set id (live preview). */
  setPRs: (setId: string) => PRType[] | undefined
  incompleteIds: Set<string>
  onChange: (setId: string, field: 'reps' | 'weight', value: string) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onRemove: () => void
}

/** Only digits (reps) or digits + one decimal separator (weight) while typing. */
const sanitize = (v: string, decimal: boolean) =>
  decimal ? v.replace(/[^\d.,]/g, '').replace(/([.,]).*?[.,]/g, '$1') : v.replace(/\D/g, '')

export function ExerciseCard({ index, entry, exercise, prs, last, setPRs, incompleteIds, onChange, onAddSet, onRemoveSet, onRemove }: Props) {
  const unit = repsUnit(exercise)
  return (
    <section className="card space-y-4 !p-4" aria-label={exercise.name}>
      <header className="flex items-start gap-3">
        <span className="inset grid size-10 shrink-0 place-items-center text-sm font-semibold text-accent">{index}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight font-semibold">{exercise.name}</h3>
          <p className="text-sm text-slate-500">
            {exercise.primary} · {exercise.equipment}
          </p>
        </div>
        <button className="btn-icon !size-10 !bg-transparent text-slate-500" onClick={onRemove} aria-label={`Remove ${exercise.name}`}>
          <TrashIcon className="h-5 w-5" />
        </button>
      </header>

      <PRLine prs={prs} exercise={exercise} />

      <div>
        <div className="grid grid-cols-[1.75rem_1fr_1fr_2rem_2.5rem] items-end gap-2 px-0.5 pb-1.5 text-center text-xs font-medium text-slate-500">
          <span>#</span>
          <span className="capitalize">{unit}</span>
          <span>{exercise.bodyweight ? '+ kg (optional)' : 'Weight (kg)'}</span>
          <span />
          <span />
        </div>
        <ul className="space-y-2">
          {entry.sets.map((s, i) => {
            const pr = setPRs(s.id)
            const bad = incompleteIds.has(s.id)
            return (
              <li key={s.id} className="grid grid-cols-[1.75rem_1fr_1fr_2rem_2.5rem] items-center gap-2">
                <span className="text-center text-sm font-semibold text-slate-500">{i + 1}</span>
                <input
                  className={`num ${bad && !s.reps ? '!border-red-500' : ''}`}
                  inputMode="numeric"
                  enterKeyHint="next"
                  aria-label={`Set ${i + 1} ${unit}`}
                  placeholder="0"
                  value={s.reps}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => onChange(s.id, 'reps', sanitize(e.target.value, false))}
                />
                <input
                  className={`num ${bad && !s.weight ? '!border-red-500' : ''}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  aria-label={`Set ${i + 1} weight in kg`}
                  placeholder={exercise.bodyweight ? '–' : '0'}
                  value={s.weight}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => onChange(s.id, 'weight', sanitize(e.target.value, true))}
                />
                <span className="text-center text-base">{pr ? <PRBadge types={pr} /> : null}</span>
                <button className="btn-icon !size-10 !bg-transparent text-slate-500" onClick={() => onRemoveSet(s.id)} aria-label={`Delete set ${i + 1}`}>
                  <XIcon className="h-5 w-5" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <button className="btn-secondary w-full !min-h-11" onClick={onAddSet}>
        <PlusIcon className="h-4 w-4" /> Add set
      </button>

      <p className="text-sm text-slate-500">
        {last ? (
          <>
            Last time ({formatShortDate(last.date)}): <span className="font-medium text-slate-900 dark:text-white">{formatSets(last.sets, exercise)}</span>
          </>
        ) : (
          'First time – nothing to compare with yet.'
        )}
      </p>
    </section>
  )
}
