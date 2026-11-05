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
      title="Übung hinzufügen"
      onClose={onClose}
      footer={
        <button className="btn-secondary w-full" onClick={onCreate}>
          <PlusIcon className="h-5 w-5" /> Eigene Übung anlegen
        </button>
      }
    >
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-white px-4 pb-2 dark:bg-slate-900">
        <input
          className="field"
          type="search"
          placeholder="Suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
          <button className={`chip ${group === null ? 'chip-active' : ''}`} onClick={() => setGroup(null)}>
            Alle
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} className={`chip ${group === g ? 'chip-active' : ''}`} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Nichts gefunden. Lege eine eigene Übung an.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((e) => {
            const used = usedIds.has(e.id)
            return (
              <li key={e.id}>
                <button
                  className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-40"
                  disabled={used}
                  onClick={() => onSelect(e)}
                >
                  <span>
                    <span className="block font-semibold">
                      {e.name}
                      {e.custom && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">eigene</span>}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {[e.primary, ...e.secondary].join(', ')} · {e.equipment}
                    </span>
                  </span>
                  {used && <span className="text-sm text-slate-500">im Training</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
