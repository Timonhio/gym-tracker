import { useMemo, useState } from 'react'
import { filterExercises } from '../lib/search'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../lib/types'
import { Modal } from './Modal'
import { PlusIcon } from './icons'

/** Searchable exercise list with body-part chips. Used by the training page. */
export function ExercisePicker({
  catalog,
  usedIds,
  onSelect,
  onCreate,
  onClose,
}: {
  catalog: Exercise[]
  usedIds: Set<string>
  onSelect: (e: Exercise) => void
  onCreate: () => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const results = useMemo(() => filterExercises(catalog, query, group), [catalog, query, group])

  return (
    <Modal
      title="Add exercise"
      onClose={onClose}
      footer={
        <button className="btn-secondary w-full" onClick={onCreate}>
          <PlusIcon className="h-5 w-5" /> Create custom exercise
        </button>
      }
    >
      <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-white px-5 pb-3 dark:bg-slate-900">
        <input
          className="field"
          type="search"
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <button className={`chip ${group === null ? 'chip-active' : ''}`} onClick={() => setGroup(null)}>
            All
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} className={`chip ${group === g ? 'chip-active' : ''}`} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Nothing found. Create a custom exercise.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {results.map((e) => {
            const used = usedIds.has(e.id)
            return (
              <li key={e.id}>
                <button
                  className="flex min-h-16 w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-40"
                  disabled={used}
                  onClick={() => onSelect(e)}
                >
                  <span>
                    <span className="block font-semibold">
                      {e.name}
                      {e.custom && <span className="tag">custom</span>}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {[e.primary, ...e.secondary].join(', ')} · {e.equipment}
                    </span>
                  </span>
                  {used && <span className="text-sm text-slate-500">in session</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
