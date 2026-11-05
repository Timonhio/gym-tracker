import { useMemo, useState } from 'react'
import { ExerciseForm } from '../components/ExerciseForm'
import { PRLine } from '../components/PRLine'
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { deleteCustomExercise, saveCustomExercise } from '../db/actions'
import { useData } from '../db/DataProvider'
import { currentPRs } from '../lib/pr'
import { filterExercises } from '../lib/search'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../lib/types'

export default function ExercisesPage() {
  const { catalog, workouts } = useData()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  const results = useMemo(() => filterExercises(catalog, query, group), [catalog, query, group])
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of workouts) for (const e of w.entries) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1)
    return m
  }, [workouts])

  async function remove(e: Exercise) {
    const used = usage.get(e.id) ?? 0
    const msg = used
      ? `„${e.name}“ wird in ${used} Trainings verwendet. Die Einträge bleiben im Verlauf als „Gelöschte Übung“ erhalten. Trotzdem löschen?`
      : `„${e.name}“ löschen?`
    if (!confirm(msg)) return
    await deleteCustomExercise(e.id)
    toast('Übung gelöscht.')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Übungen</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <PlusIcon className="h-5 w-5" /> Eigene
        </button>
      </div>

      <input className="field" type="search" placeholder="Übung suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
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

      <p className="text-sm text-slate-500">{results.length} Übungen</p>

      <ul className="space-y-2">
        {results.map((e) => (
          <li key={e.id}>
            <details className="card group !p-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="block font-semibold">
                    {e.name}
                    {e.custom && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">eigene</span>
                    )}
                  </span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {[e.primary, ...e.secondary].join(', ')} · {e.equipment}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-slate-500">{usage.get(e.id) ? `${usage.get(e.id)}×` : ''}</span>
              </summary>
              <div className="space-y-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                <PRLine prs={currentPRs(workouts, e.id, e.bodyweight)} exercise={e} />
                {e.custom && (
                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1" onClick={() => setEditing(e)}>
                      <PencilIcon className="h-5 w-5" /> Bearbeiten
                    </button>
                    <button className="btn-ghost flex-1 !text-red-600 dark:!text-red-400" onClick={() => remove(e)}>
                      <TrashIcon className="h-5 w-5" /> Löschen
                    </button>
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {editing && (
        <ExerciseForm
          initial={editing === 'new' ? undefined : editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSave={async (e) => {
            await saveCustomExercise(e)
            setEditing(null)
            toast(`„${e.name}“ gespeichert.`)
          }}
        />
      )}
    </div>
  )
}
