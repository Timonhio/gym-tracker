import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PRBadge } from '../components/PRBadge'
import { PencilIcon, TrashIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { deleteWorkout } from '../db/actions'
import { useData } from '../db/DataProvider'
import { formatDate } from '../lib/dates'
import { formatNumber, formatWeight, plural, prLabel, repsUnit } from '../lib/format'
import { compareWorkouts, isValidSet, setKey } from '../lib/pr'
import { countValidSets, workoutVolume } from '../lib/stats'
import type { Workout } from '../lib/types'

export default function HistoryPage() {
  const { workouts, lookup, isBodyweight, setPRs } = useData()
  const navigate = useNavigate()
  const toast = useToast()
  const [openId, setOpenId] = useState<string | null>(null)

  const sorted = useMemo(() => [...workouts].sort(compareWorkouts).reverse(), [workouts])

  const prCount = (w: Workout) => w.entries.reduce((n, e) => n + e.sets.filter((s) => setPRs.has(setKey(w.id, s.id))).length, 0)

  async function remove(w: Workout) {
    if (!confirm(`Training vom ${formatDate(w.date)} wirklich löschen? Die PRs werden neu berechnet.`)) return
    await deleteWorkout(w.id)
    setOpenId(null)
    toast('Training gelöscht.')
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold">Verlauf</h1>

      {sorted.length === 0 && (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Noch keine Trainings</p>
          <p className="mt-1">
            Starte dein erstes <Link to="/" className="font-semibold text-emerald-600 underline dark:text-emerald-400">Training</Link> – oder lade in den{' '}
            <Link to="/settings" className="font-semibold text-emerald-600 underline dark:text-emerald-400">Einstellungen</Link> Demo-Daten.
          </p>
        </div>
      )}

      {sorted.map((w) => {
        const open = openId === w.id
        const sets = countValidSets(w, isBodyweight)
        const volume = workoutVolume(w, isBodyweight)
        const prs = prCount(w)
        return (
          <article key={w.id} className="card !p-0 overflow-hidden">
            <button
              className="flex w-full items-start justify-between gap-3 p-4 text-left"
              onClick={() => setOpenId(open ? null : w.id)}
              aria-expanded={open}
            >
              <span>
                <span className="block text-lg font-bold">{formatDate(w.date)}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">
                  {w.entries.map((e) => lookup(e.exerciseId).name).join(', ')}
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  {plural(w.entries.length, 'Übung', 'Übungen')} · {plural(sets, 'Satz', 'Sätze')}{volume > 0 && ` · ${formatNumber(Math.round(volume))} kg Volumen`}
                </span>
              </span>
              {prs > 0 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  🏆 {prs}
                </span>
              )}
            </button>

            {open && (
              <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800">
                {w.entries.map((e) => {
                  const ex = lookup(e.exerciseId)
                  return (
                    <div key={e.exerciseId}>
                      <h3 className="font-semibold">{ex.name}</h3>
                      <ol className="mt-1 space-y-1">
                        {e.sets.map((s, i) => {
                          const types = setPRs.get(setKey(w.id, s.id))
                          const valid = isValidSet(s, ex.bodyweight)
                          return (
                            <li key={s.id} className={`flex items-center gap-2 text-sm ${valid ? '' : 'text-slate-400 line-through'}`}>
                              <span className="w-5 text-slate-400">{i + 1}.</span>
                              <span className="font-medium">
                                {s.reps} {s.weight ? `× ${formatWeight(s.weight)}` : repsUnit(ex)}
                              </span>
                              {types && (
                                <>
                                  <PRBadge types={types} />
                                  <span className="text-xs text-amber-700 dark:text-amber-400">
                                    {[...new Set(types.map(prLabel))].join(' · ')}
                                  </span>
                                </>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )
                })}
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => navigate(`/edit/${w.id}`)}>
                    <PencilIcon className="h-5 w-5" /> Bearbeiten
                  </button>
                  <button className="btn-ghost flex-1 !text-red-600 dark:!text-red-400" onClick={() => remove(w)}>
                    <TrashIcon className="h-5 w-5" /> Löschen
                  </button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
