import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BodyWeightCard } from '../components/BodyWeightCard'
import { AXIS, TOOLTIP } from '../components/chartStyle'
import { PageHeader } from '../components/PageHeader'
import { PhotosCard } from '../components/PhotosCard'
import { useData } from '../db/DataProvider'
import { WEEKDAYS_SHORT, formatDate, formatShortDate } from '../lib/dates'
import { formatNumber, formatVolume, formatWeight, plural, prLabel, repsUnit } from '../lib/format'
import { balanceInsights, favoriteWeekday, neglectInsights, volumeInsight, type Insight } from '../lib/insights'
import { currentPRs } from '../lib/pr'
import {
  RANGES,
  countValidSets,
  exerciseProgress,
  exerciseRanking,
  inRange,
  latestPRs,
  movementBalance,
  rangeStart,
  regionRecency,
  setsByMuscle,
  volumeTrend,
  weekdayCounts,
  weeklyStreak,
  workoutsPerWeek,
  type RangeKey,
} from '../lib/stats'

// ---- small building blocks ---------------------------------------------------------

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card space-y-4">
      <div>
        <p className="eyebrow mb-1">{title}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card !rounded-[1.75rem] !p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-3xl leading-none font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/** Insights are plain text rows; only a thin left rule hints at the level. */
const LEVEL_RULE: Record<Insight['level'], string> = {
  warn: 'border-[var(--accent-solid)]',
  good: 'border-slate-400/60',
  info: 'border-slate-400/60',
}

// ---- page -------------------------------------------------------------------------------

export default function DashboardPage() {
  const { workouts, lookup, isBodyweight, setPRs } = useData()
  const [range, setRange] = useState<RangeKey>('3m')
  const [exerciseId, setExerciseId] = useState<string>('')
  const now = useMemo(() => new Date(), [])

  const inR = useMemo(() => inRange(workouts, range, now), [workouts, range, now])
  const sets = useMemo(() => inR.reduce((n, w) => n + countValidSets(w, isBodyweight), 0), [inR, isBodyweight])
  const streak = useMemo(() => weeklyStreak(workouts, now), [workouts, now])
  const trend = useMemo(() => volumeTrend(workouts, range, now, isBodyweight), [workouts, range, now, isBodyweight])
  const weeks = useMemo(() => workoutsPerWeek(workouts, range, now), [workouts, range, now])
  const ranking = useMemo(() => exerciseRanking(inR, lookup), [inR, lookup])
  const muscles = useMemo(() => setsByMuscle(inR, lookup), [inR, lookup])
  const balance = useMemo(() => movementBalance(inR, lookup), [inR, lookup])
  const weekdays = useMemo(() => weekdayCounts(inR), [inR])
  const recency = useMemo(() => regionRecency(workouts, lookup, now), [workouts, lookup, now])
  const newest = useMemo(() => latestPRs(workouts, setPRs, lookup, 8), [workouts, setPRs, lookup])

  const insights: Insight[] = useMemo(() => {
    const out = [...neglectInsights(recency, workouts.length > 0), ...balanceInsights(balance)]
    const v = volumeInsight(trend)
    if (v) out.push(v)
    const fav = favoriteWeekday(weekdays)
    if (fav) out.push({ level: 'info', text: `Your most frequent training day: ${fav.name} (${fav.count}×).` })
    return out
  }, [recency, workouts.length, balance, trend, weekdays])

  // exercises that have data -> picker for the progress chart
  const trained = useMemo(() => exerciseRanking(workouts, lookup), [workouts, lookup])
  useEffect(() => {
    if (trained.length > 0 && !trained.some((t) => t.exerciseId === exerciseId)) setExerciseId(trained[0].exerciseId)
  }, [trained, exerciseId])

  const selected = exerciseId ? lookup(exerciseId) : null
  const progress = useMemo(() => {
    if (!selected) return []
    const start = rangeStart(range, now)
    return exerciseProgress(workouts, selected.id, selected.bodyweight, setPRs)
      .filter((p) => start === null || p.date >= start)
      .map((p) => ({ ...p, e1rm: p.e1rm === null ? null : Math.round(p.e1rm * 10) / 10 }))
  }, [selected, workouts, setPRs, range, now])
  const hasWeights = progress.some((p) => p.topWeight !== null)
  const hasBwReps = progress.some((p) => p.maxBodyweightReps !== null)

  const allPRs = useMemo(
    () =>
      trained.map((t) => {
        const ex = lookup(t.exerciseId)
        return { ex, prs: currentPRs(workouts, t.exerciseId, ex.bodyweight) }
      }),
    [trained, workouts, lookup],
  )

  const perWeek = weeks.length ? inR.length / weeks.length : 0
  const maxMuscle = Math.max(1, ...muscles.map((m) => m.sets))
  const maxRank = Math.max(1, ...ranking.map((r) => r.workouts))
  const hasWorkouts = workouts.length > 0

  return (
    <div>
      <PageHeader title="Progress" />

      <div className="space-y-4">
        <div
          className="sticky top-0 z-20 -mx-4 bg-slate-100/90 px-4 py-2 backdrop-blur dark:bg-black/90"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)', marginTop: 'calc(-1 * env(safe-area-inset-top))' }}
        >
          <div className="grid grid-cols-4 gap-1 rounded-full bg-slate-200 p-1 dark:bg-slate-900" role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="radio"
                aria-checked={range === r.key}
                className={`min-h-10 rounded-full px-1 text-sm font-semibold transition-colors ${
                  range === r.key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'
                }`}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {hasWorkouts && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Workouts" value={String(inR.length)} hint={`${formatNumber(Math.round(perWeek * 10) / 10)} per week on average`} />
              <Tile
                label="Streak"
                value={plural(streak.current, 'week', 'weeks')}
                hint={`Best: ${streak.longest} · at least 1 workout per week`}
              />
              <Tile
                label="Volume"
                value={formatVolume(trend.current)}
                hint={
                  trend.changePct === null
                    ? 'Sets × reps × kg'
                    : `${trend.changePct >= 0 ? '▲ +' : '▼ '}${formatNumber(Math.round(trend.changePct))}% vs. previous period`
                }
              />
              <Tile label="Sets" value={formatNumber(sets)} hint={inR.length ? `${formatNumber(Math.round((sets / inR.length) * 10) / 10)} per workout` : undefined} />
            </div>

            <Section title="Workouts per week" subtitle="Calendar weeks, Monday to Sunday">
              <div className="h-52" role="img" aria-label="Bar chart: workouts per week">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeks} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="weekStart" tickFormatter={formatShortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                    <Tooltip {...TOOLTIP} labelFormatter={(l) => `Week of ${formatShortDate(String(l))}`} formatter={(v) => [String(v), 'Workouts']} />
                    <Bar dataKey="count" name="Workouts" fill="var(--series-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </>
        )}

        <BodyWeightCard range={range} now={now} />
        <PhotosCard />

        {!hasWorkouts && (
          <div className="card text-center">
            <p className="text-lg font-semibold">No workouts yet</p>
            <p className="mt-1 text-slate-500">
              Save your first workout – or load demo data in the{' '}
              <Link to="/settings" className="text-accent underline">settings</Link> to try the charts.
            </p>
          </div>
        )}

        {hasWorkouts && (
          <>
            {insights.length > 0 && (
              <Section title="Insights">
                <ul className="space-y-2.5">
                  {insights.map((i, idx) => (
                    <li key={idx} className={`border-l-2 py-0.5 pl-3 text-[15px] ${LEVEL_RULE[i.level]}`}>
                      {i.text}
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="mb-2 text-sm text-slate-500">Workouts by weekday</p>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                    {weekdays.map((c, i) => (
                      <div key={i}>
                        <div className="flex h-14 items-end justify-center">
                          <div
                            className="w-full max-w-7 rounded-full bg-[var(--series-1)]"
                            style={{ height: `${Math.max(c ? 12 : 4, (c / Math.max(1, ...weekdays)) * 100)}%`, opacity: c ? 1 : 0.25 }}
                            title={`${c}×`}
                          />
                        </div>
                        <span className="mt-1 block text-slate-500">{WEEKDAYS_SHORT[i]}</span>
                        <span className="block font-semibold">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            <Section title="Strength progress" subtitle="Top weight and estimated 1RM (Epley) per workout · ring = PR">
              {selected && (
                <>
                  <label className="sr-only" htmlFor="progress-exercise">Exercise</label>
                  <select id="progress-exercise" className="field" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
                    {trained.map((t) => (
                      <option key={t.exerciseId} value={t.exerciseId}>
                        {t.name} ({t.workouts}×)
                      </option>
                    ))}
                  </select>
                  {progress.length === 0 ? (
                    <p className="py-8 text-center text-slate-500">No workout with this exercise in this period.</p>
                  ) : (
                    <>
                      <div className="h-64" role="img" aria-label={`Line chart: progress for ${selected.name}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={progress} margin={{ top: 16, right: 12, bottom: 0, left: -12 }}>
                            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                            <YAxis
                              tick={AXIS}
                              tickLine={false}
                              axisLine={false}
                              domain={[(min: number) => Math.max(0, Math.floor(min * 0.9)), (max: number) => Math.ceil(max * 1.05)]}
                            />
                            <Tooltip
                              {...TOOLTIP}
                              cursor={{ stroke: 'var(--chart-grid)' }}
                              labelFormatter={(l) => formatDate(String(l))}
                              formatter={(v, name) => [name === 'Reps' ? `${v} ${repsUnit(selected)}` : formatWeight(Number(v)), name]}
                            />
                            <Legend wrapperStyle={{ color: 'var(--chart-text-2)', fontSize: 13 }} />
                            {hasWeights && (
                              <Line
                                type="linear"
                                dataKey="topWeight"
                                name="Top weight"
                                stroke="var(--series-1)"
                                strokeWidth={2.5}
                                connectNulls
                                dot={<PRDot color="var(--series-1)" />}
                                activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                              />
                            )}
                            {hasWeights && (
                              <Line
                                type="linear"
                                dataKey="e1rm"
                                name="Estimated 1RM"
                                stroke="var(--series-2)"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                connectNulls
                                dot={{ r: 2.5, fill: 'var(--series-2)', strokeWidth: 0 }}
                                activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                              />
                            )}
                            {hasBwReps && (
                              <Line
                                type="linear"
                                dataKey="maxBodyweightReps"
                                name="Reps"
                                stroke="var(--series-1)"
                                strokeWidth={2.5}
                                connectNulls
                                dot={<PRDot color="var(--series-1)" />}
                                activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer list-none text-slate-500">Show as table ▾</summary>
                        <table className="mt-2 w-full text-left">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1 font-medium">Date</th>
                              <th className="font-medium">Top weight</th>
                              <th className="font-medium">1RM</th>
                              <th className="font-medium">Max reps (no added weight)</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {[...progress].reverse().map((p) => (
                              <tr key={p.workoutId} className="border-t border-black/5 dark:border-white/[0.06]">
                                <td className="py-1.5">{formatShortDate(p.date)}</td>
                                <td>{p.topWeight ? formatWeight(p.topWeight) : '–'}</td>
                                <td>{p.e1rm ? formatWeight(p.e1rm) : '–'}</td>
                                <td>{p.maxBodyweightReps ?? '–'}</td>
                                <td>{p.isPR ? '🏆' : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    </>
                  )}
                </>
              )}
            </Section>

            <Section title="Muscles trained" subtitle="Sets by primary muscle group">
              {muscles.length === 0 ? (
                <p className="text-slate-500">No sets in this period.</p>
              ) : (
                <ul className="space-y-2.5" aria-label="Sets per muscle group">
                  {muscles.map((m) => (
                    <li key={m.muscle} className="grid grid-cols-[5.75rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="font-medium">{m.muscle}</span>
                      <span className="h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                        <span className="block h-full rounded-full bg-[var(--series-1)]" style={{ width: `${(m.sets / maxMuscle) * 100}%` }} />
                      </span>
                      <span className="text-right font-semibold tabular-nums">{m.sets}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Most trained exercises" subtitle="Number of workouts the exercise appeared in">
              {ranking.length === 0 ? (
                <p className="text-slate-500">No exercises in this period.</p>
              ) : (
                <ol className="space-y-3">
                  {ranking.slice(0, 10).map((r, i) => (
                    <li key={r.exerciseId} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 text-sm">
                      <span className="text-slate-500">{i + 1}</span>
                      <span>
                        <span className="font-medium">{r.name}</span>
                        <span className="mt-1.5 block h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                          <span className="block h-full rounded-full bg-[var(--series-1)]" style={{ width: `${(r.workouts / maxRank) * 100}%` }} />
                        </span>
                      </span>
                      <span className="text-right text-slate-500">
                        <strong className="text-slate-900 dark:text-white">{r.workouts}×</strong> · {plural(r.sets, 'set', 'sets')}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section title="Latest PRs">
              {newest.length === 0 ? (
                <p className="text-slate-500">No PRs yet.</p>
              ) : (
                <ul className="divide-y divide-black/5 dark:divide-white/[0.06]">
                  {newest.map((p) => (
                    <li key={`${p.workoutId}-${p.exerciseId}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span>
                        <span className="block font-semibold">{p.exerciseName}</span>
                        <span className="text-slate-500">
                          {p.weight ? `${formatWeight(p.weight)} × ${p.reps}` : `${p.reps} reps`} · {[...new Set(p.types.map(prLabel))].join(', ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-500">{formatShortDate(p.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="All current PRs" subtitle="Per exercise: heaviest set, best estimated 1RM, most reps without added weight">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">Exercise</th>
                      <th className="font-medium">Weight</th>
                      <th className="font-medium">1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPRs.map(({ ex, prs }) => (
                      <tr key={ex.id} className="border-t border-black/5 dark:border-white/[0.06]">
                        <td className="py-2.5 pr-2 font-medium">{ex.name}</td>
                        <td>{prs.weight ? `${formatWeight(prs.weight.weight)} × ${prs.weight.reps}` : prs.bodyweightReps ? `${prs.bodyweightReps.reps} ${repsUnit(ex)}` : '–'}</td>
                        <td>{prs.e1rm ? formatWeight(Math.round(prs.e1rm.value * 10) / 10) : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

/** Line dot: a small filled point, or a hollow ring when that workout contained a PR. */
function PRDot(props: { cx?: number; cy?: number; payload?: { isPR?: boolean }; color: string }) {
  const { cx, cy, payload, color } = props
  if (cx === undefined || cy === undefined) return <g />
  if (!payload?.isPR) return <circle cx={cx} cy={cy} r={2.5} fill={color} />
  return <circle cx={cx} cy={cy} r={5.5} fill="var(--chart-surface)" stroke={color} strokeWidth={2.5} />
}
