import type { DraftEntry } from '../lib/draft'
import { formatSets, repsUnit } from '../lib/format'
import { formatShortDate } from '../lib/dates'
import type { LastEntry } from '../lib/history'
import type { ExercisePRs } from '../lib/pr'
import type { Exercise, PRType } from '../lib/types'
import { PRBadge } from './PRBadge'
import { PRLine } from './PRLine'
import { PlusIcon, TrashIcon, XIcon } from './icons'

interface Props {
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

export function ExerciseCard({ entry, exercise, prs, last, setPRs, incompleteIds, onChange, onAddSet, onRemoveSet, onRemove }: Props) {
  return (
    <section className="card space-y-3" aria-label={exercise.name}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-tight font-bold">{exercise.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {exercise.primary} · {exercise.equipment}
          </p>
        </div>
        <button className="btn-ghost !min-h-10 !px-2 text-slate-400" onClick={onRemove} aria-label={`${exercise.name} entfernen`}>
          <TrashIcon className="h-5 w-5" />
        </button>
      </header>

      <PRLine prs={prs} exercise={exercise} />

      <div>
        <div className="grid grid-cols-[1.75rem_1fr_1fr_2rem_2.5rem] items-end gap-1.5 px-0.5 pb-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>#</span>
          <span>{repsUnit(exercise)}</span>
          <span>{exercise.bodyweight ? 'Zusatz-kg (opt.)' : 'Gewicht (kg)'}</span>
          <span />
          <span />
        </div>
        <ul className="space-y-1.5">
          {entry.sets.map((s, i) => {
            const pr = setPRs(s.id)
            const bad = incompleteIds.has(s.id)
            return (
              <li key={s.id} className="grid grid-cols-[1.75rem_1fr_1fr_2rem_2.5rem] items-center gap-1.5">
                <span className="text-center text-sm font-semibold text-slate-400">{i + 1}</span>
                <input
                  className={`num ${bad && !s.reps ? '!border-red-500' : ''}`}
                  inputMode="numeric"
                  enterKeyHint="next"
                  aria-label={`Satz ${i + 1} ${repsUnit(exercise)}`}
                  placeholder="0"
                  value={s.reps}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => onChange(s.id, 'reps', sanitize(e.target.value, false))}
                />
                <input
                  className={`num ${bad && !s.weight ? '!border-red-500' : ''}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  aria-label={`Satz ${i + 1} Gewicht in kg`}
                  placeholder={exercise.bodyweight ? '–' : '0'}
                  value={s.weight}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => onChange(s.id, 'weight', sanitize(e.target.value, true))}
                />
                <span className="text-center text-xl">{pr ? <PRBadge types={pr} /> : null}</span>
                <button className="btn-ghost !min-h-10 !px-1 text-slate-400" onClick={() => onRemoveSet(s.id)} aria-label={`Satz ${i + 1} löschen`}>
                  <XIcon className="h-5 w-5" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <button className="btn-secondary w-full" onClick={onAddSet}>
        <PlusIcon className="h-5 w-5" /> Satz
      </button>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {last ? (
          <>
            Letztes Mal ({formatShortDate(last.date)}): <span className="font-medium text-slate-700 dark:text-slate-300">{formatSets(last.sets, exercise)}</span>
          </>
        ) : (
          'Das erste Mal – noch keine Vergleichswerte.'
        )}
      </p>
    </section>
  )
}
