import { useMemo, useState } from 'react'
import { ExerciseForm } from '../components/ExerciseForm'
import { PageHeader } from '../components/PageHeader'
import { PRLine } from '../components/PRLine'
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { deleteCustomExercise, saveCustomExercise } from '../db/actions'
import { useData } from '../db/DataProvider'
import { plural } from '../lib/format'
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
      ? `“${e.name}” is used in ${plural(used, 'workout', 'workouts')}. Those entries stay in your history as “Deleted exercise”. Delete anyway?`
      : `Delete “${e.name}”?`
    if (!confirm(msg)) return
    await deleteCustomExercise(e.id)
    toast('Exercise deleted.')
  }

  return (
    <div>
      <PageHeader
        title="Exercises"
        actions={
          <button className="btn-icon" onClick={() => setEditing('new')} aria-label="Create custom exercise">
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />

      <div className="space-y-3">
        <input className="field" type="search" placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button className={`chip ${group === null ? 'chip-active' : ''}`} onClick={() => setGroup(null)}>
            All
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} className={`chip ${group === g ? 'chip-active' : ''}`} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>

        <p className="eyebrow pt-1">{plural(results.length, 'exercise', 'exercises')}</p>

        <ul className="space-y-2">
          {results.map((e) => (
            <li key={e.id}>
              <details className="card !rounded-2xl !p-0">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span className="block font-semibold">
                      {e.name}
                      {e.custom && <span className="tag">custom</span>}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {[e.primary, ...e.secondary].join(', ')} · {e.equipment}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">{usage.get(e.id) ? `${usage.get(e.id)}×` : ''}</span>
                </summary>
                <div className="space-y-3 border-t border-black/5 px-4 py-3 dark:border-white/[0.07]">
                  <PRLine prs={currentPRs(workouts, e.id, e.bodyweight)} exercise={e} />
                  {e.custom && (
                    <div className="flex gap-2">
                      <button className="btn-secondary flex-1" onClick={() => setEditing(e)}>
                        <PencilIcon className="h-5 w-5" /> Edit
                      </button>
                      <button className="btn-ghost flex-1 !text-red-500" onClick={() => remove(e)}>
                        <TrashIcon className="h-5 w-5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <ExerciseForm
          initial={editing === 'new' ? undefined : editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSave={async (e) => {
            await saveCustomExercise(e)
            setEditing(null)
            toast(`“${e.name}” saved.`)
          }}
        />
      )}
    </div>
  )
}
