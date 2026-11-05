import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BodyMap } from '../components/BodyMap'
import { PageHeader } from '../components/PageHeader'
import { PRBadge } from '../components/PRBadge'
import { SessionSummary } from '../components/SessionSummary'
import { PencilIcon, TrashIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { deleteWorkout } from '../db/actions'
import { useData } from '../db/DataProvider'
import { formatDate } from '../lib/dates'
import { formatSets, formatVolume, formatWeight, plural, prLabel, repsUnit } from '../lib/format'
import { compareWorkouts, isValidSet, setKey } from '../lib/pr'
import { entriesFromWorkout, sessionTargets, workoutDisplayName } from '../lib/session'
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
    if (!confirm(`Delete the workout from ${formatDate(w.date)}? PRs will be recalculated.`)) return
    await deleteWorkout(w.id)
    setOpenId(null)
    toast('Workout deleted.')
  }

  return (
    <div>
      <PageHeader title="History" />

      {sorted.length === 0 && (
        <div className="card text-center">
          <p className="text-lg font-semibold">No workouts yet</p>
          <p className="mt-1 text-slate-500">
            Start your first <Link to="/" className="text-accent underline">workout</Link> – or load demo data in the{' '}
            <Link to="/settings" className="text-accent underline">settings</Link>.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((w) => {
          const open = openId === w.id
          const targets = sessionTargets(entriesFromWorkout(w, lookup), lookup)
          const name = workoutDisplayName(w, lookup)
          const sets = countValidSets(w, isBodyweight)
          const volume = workoutVolume(w, isBodyweight)
          const prs = prCount(w)
          return (
            <article key={w.id} className="card overflow-hidden !p-0">
              <button
                className="flex w-full items-center gap-4 p-4 text-left"
                onClick={() => setOpenId(open ? null : w.id)}
                aria-expanded={open}
              >
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block">{formatDate(w.date)}</span>
                  <span className="mt-1 block text-xl leading-tight font-bold tracking-tight">{name}</span>
                  <span className="mt-1.5 block text-sm text-slate-500">
                    {plural(w.entries.length, 'exercise', 'exercises')} · {plural(sets, 'set', 'sets')}
                    {volume > 0 && ` · ${formatVolume(volume)}`}
                    {prs > 0 && ` · 🏆 ${prs}`}
                  </span>
                </span>
                <BodyMap primary={targets.primary} secondary={targets.secondary} className="h-20 shrink-0" />
              </button>

              {open && (
                <div className="space-y-5 border-t border-black/5 p-4 dark:border-white/[0.07]">
                  <SessionSummary
                    targets={targets}
                    moves={w.entries.length}
                    sets={sets}
                    volume={volume}
                    prs={prs}
                    heading="Targets"
                  />

                  <div>
                    <p className="eyebrow mb-2">Exercises</p>
                    <ol className="space-y-2">
                      {w.entries.map((e, idx) => {
                        const ex = lookup(e.exerciseId)
                        return (
                          <li key={e.exerciseId} className="inset p-3.5">
                            <div className="flex items-baseline gap-3">
                              <span className="w-4 text-sm text-slate-500">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold">{ex.name}</p>
                                <p className="text-sm text-slate-500">
                                  {formatSets(e.sets, ex) || 'No valid sets'} · {ex.primary}
                                </p>
                              </div>
                            </div>
                            <ul className="mt-2 space-y-1 pl-7">
                              {e.sets.map((s, i) => {
                                const types = setPRs.get(setKey(w.id, s.id))
                                const valid = isValidSet(s, ex.bodyweight)
                                return (
                                  <li key={s.id} className={`flex items-center gap-2 text-sm ${valid ? '' : 'text-slate-500 line-through'}`}>
                                    <span className="w-5 text-slate-500">{i + 1}.</span>
                                    <span className="font-medium">
                                      {s.reps ?? 0} {s.weight ? `× ${formatWeight(s.weight)}` : repsUnit(ex)}
                                    </span>
                                    {types && (
                                      <>
                                        <PRBadge types={types} />
                                        <span className="text-xs text-slate-500">{[...new Set(types.map(prLabel))].join(' · ')}</span>
                                      </>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </li>
                        )
                      })}
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1" onClick={() => navigate(`/edit/${w.id}`)}>
                      <PencilIcon className="h-5 w-5" /> Edit
                    </button>
                    <button className="btn-ghost flex-1 !text-red-500" onClick={() => remove(w)}>
                      <TrashIcon className="h-5 w-5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
