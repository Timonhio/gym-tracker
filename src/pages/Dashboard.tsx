import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../db/DataProvider'
import { formatDate, formatShortDate, WEEKDAYS_SHORT_DE } from '../lib/dates'
import { formatNumber, formatWeight, prLabel, repsUnit } from '../lib/format'
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
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card !p-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

const AXIS = { fontSize: 12, fill: 'var(--chart-text-2)' }
const TOOLTIP = {
  contentStyle: {
    background: 'var(--chart-surface)',
    border: '1px solid var(--chart-grid)',
    borderRadius: 12,
    color: 'var(--chart-text)',
  },
  labelStyle: { color: 'var(--chart-text)', fontWeight: 600 },
  itemStyle: { color: 'var(--chart-text)' },
  cursor: { fill: 'var(--chart-grid)', opacity: 0.5 },
}

const formatVolume = (kg: number) => (kg >= 1000 ? `${formatNumber(Math.round(kg / 100) / 10)} t` : `${formatNumber(Math.round(kg))} kg`)

const ICON_BG: Record<Insight['level'], string> = {
  warn: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  good: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  info: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
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
    if (fav) out.push({ icon: '📅', level: 'info', text: `Dein häufigster Trainingstag: ${fav.name} (${fav.count}×).` })
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

  if (workouts.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <div className="card text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Noch keine Daten</p>
          <p className="mt-1">
            Speichere dein erstes Training – oder lade in den{' '}
            <Link to="/settings" className="font-semibold text-emerald-600 underline dark:text-emerald-400">Einstellungen</Link> Demo-Daten, um das Dashboard auszuprobieren.
          </p>
        </div>
      </div>
    )
  }

  const perWeek = weeks.length ? inR.length / weeks.length : 0
  const maxMuscle = Math.max(1, ...muscles.map((m) => m.sets))
  const maxRank = Math.max(1, ...ranking.map((r) => r.workouts))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>

      <div className="sticky top-12 z-20 -mx-4 bg-slate-100/90 px-4 py-2 backdrop-blur dark:bg-slate-950/90">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Zeitraum">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="radio"
              aria-checked={range === r.key}
              className={`min-h-10 rounded-lg px-1 text-sm font-semibold ${
                range === r.key ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-600 dark:text-slate-400'
              }`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Trainings" value={String(inR.length)} hint={`Ø ${formatNumber(Math.round(perWeek * 10) / 10)} pro Woche`} />
        <Tile
          label="Streak"
          value={`${streak.current} ${streak.current === 1 ? 'Woche' : 'Wochen'}`}
          hint={`Rekord: ${streak.longest} · mind. 1 Training/Woche`}
        />
        <Tile
          label="Volumen"
          value={formatVolume(trend.current)}
          hint={trend.changePct === null ? 'Sätze × Wdh. × kg' : `${trend.changePct >= 0 ? '▲ +' : '▼ '}${formatNumber(Math.round(trend.changePct))} % zum Zeitraum davor`}
        />
        <Tile label="Sätze" value={String(sets)} hint={inR.length ? `Ø ${formatNumber(Math.round((sets / inR.length) * 10) / 10)} pro Training` : undefined} />
      </div>

      <Section title="Trainings pro Woche" subtitle="Kalenderwochen, Montag bis Sonntag">
        <div className="h-52" role="img" aria-label="Balkendiagramm: Trainings pro Woche">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="weekStart" tickFormatter={formatShortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP} labelFormatter={(l) => `Woche ab ${formatShortDate(String(l))}`} formatter={(v) => [String(v), 'Trainings']} />
              <Bar dataKey="count" name="Trainings" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {insights.length > 0 && (
        <Section title="Insights">
          <ul className="space-y-2">
            {insights.map((i, idx) => (
              <li key={idx} className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm font-medium ${ICON_BG[i.level]}`}>
                <span aria-hidden="true">{i.icon}</span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Trainings nach Wochentag</p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {weekdays.map((c, i) => (
                <div key={i}>
                  <div className="flex h-12 items-end justify-center">
                    <div
                      className="w-full max-w-6 rounded-t bg-[var(--series-1)]"
                      style={{ height: `${Math.max(c ? 8 : 2, (c / Math.max(1, ...weekdays)) * 100)}%`, opacity: c ? 1 : 0.25 }}
                      title={`${c}×`}
                    />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">{WEEKDAYS_SHORT_DE[i]}</span>
                  <span className="block font-semibold">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section title="Gewichtsentwicklung" subtitle="Top-Gewicht und geschätztes 1RM (Epley) pro Training · 🏆 = PR">
        {selected && (
          <>
            <label className="sr-only" htmlFor="progress-exercise">Übung</label>
            <select id="progress-exercise" className="field" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              {trained.map((t) => (
                <option key={t.exerciseId} value={t.exerciseId}>
                  {t.name} ({t.workouts}×)
                </option>
              ))}
            </select>
            {progress.length === 0 ? (
              <p className="py-8 text-center text-slate-500">In diesem Zeitraum kein Training mit dieser Übung.</p>
            ) : (
              <>
                <div className="h-64" role="img" aria-label={`Liniendiagramm: Entwicklung ${selected.name}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progress} margin={{ top: 22, right: 12, bottom: 0, left: -12 }}>
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
                        formatter={(v, name) => [name === 'Wdh.' ? `${v} ${repsUnit(selected)}` : formatWeight(Number(v)), name]}
                      />
                      <Legend wrapperStyle={{ color: 'var(--chart-text-2)', fontSize: 13 }} />
                      {hasWeights && (
                        <Line
                          type="linear"
                          dataKey="topWeight"
                          name="Top-Gewicht"
                          stroke="var(--series-1)"
                          strokeWidth={2}
                          connectNulls
                          dot={<PRDot color="var(--series-1)" />}
                          activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                        />
                      )}
                      {hasWeights && (
                        <Line
                          type="linear"
                          dataKey="e1rm"
                          name="Geschätztes 1RM"
                          stroke="var(--series-2)"
                          strokeWidth={2}
                          connectNulls
                          dot={{ r: 3, fill: 'var(--series-2)', stroke: 'var(--chart-surface)', strokeWidth: 1 }}
                          activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                        />
                      )}
                      {hasBwReps && (
                        <Line
                          type="linear"
                          dataKey="maxBodyweightReps"
                          name="Wdh."
                          stroke="var(--series-1)"
                          strokeWidth={2}
                          connectNulls
                          dot={<PRDot color="var(--series-1)" />}
                          activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Als Tabelle anzeigen</summary>
                  <table className="mt-2 w-full text-left">
                    <thead className="text-slate-500">
                      <tr><th className="py-1">Datum</th><th>Top-Gewicht</th><th>1RM</th><th>Max. Wdh. (ohne Zusatz)</th><th /></tr>
                    </thead>
                    <tbody>
                      {[...progress].reverse().map((p) => (
                        <tr key={p.workoutId} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="py-1">{formatShortDate(p.date)}</td>
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

      <Section title="Trainierte Körperpartien" subtitle="Sätze nach primärer Muskelgruppe">
        {muscles.length === 0 ? (
          <p className="text-slate-500">Keine Sätze in diesem Zeitraum.</p>
        ) : (
          <ul className="space-y-2" aria-label="Sätze pro Muskelgruppe">
            {muscles.map((m) => (
              <li key={m.muscle} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
                <span className="font-medium">{m.muscle}</span>
                <span className="h-5 rounded-r bg-slate-100 dark:bg-slate-800">
                  <span className="block h-full rounded-r bg-[var(--series-1)]" style={{ width: `${(m.sets / maxMuscle) * 100}%` }} />
                </span>
                <span className="text-right font-semibold">{m.sets}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Meistgemachte Übungen" subtitle="Anzahl Trainings, in denen die Übung vorkam">
        {ranking.length === 0 ? (
          <p className="text-slate-500">Keine Übungen in diesem Zeitraum.</p>
        ) : (
          <ol className="space-y-2">
            {ranking.slice(0, 10).map((r, i) => (
              <li key={r.exerciseId} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 text-sm">
                <span className="text-slate-400">{i + 1}</span>
                <span>
                  <span className="font-medium">{r.name}</span>
                  <span className="mt-0.5 block h-1.5 rounded bg-slate-100 dark:bg-slate-800">
                    <span className="block h-full rounded bg-[var(--series-1)]" style={{ width: `${(r.workouts / maxRank) * 100}%` }} />
                  </span>
                </span>
                <span className="text-right text-slate-600 dark:text-slate-300">
                  <strong>{r.workouts}×</strong> · {r.sets} Sätze
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Neueste PRs">
        {newest.length === 0 ? (
          <p className="text-slate-500">Noch keine PRs.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {newest.map((p) => (
              <li key={`${p.workoutId}-${p.exerciseId}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="block font-semibold">🏆 {p.exerciseName}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {p.weight ? `${formatWeight(p.weight)} × ${p.reps}` : `${p.reps} Wdh.`} · {[...new Set(p.types.map(prLabel))].join(', ')}
                  </span>
                </span>
                <span className="shrink-0 text-slate-500">{formatShortDate(p.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Alle aktuellen PRs" subtitle="Pro Übung: schwerster Satz, bestes 1RM, meiste Wdh. ohne Zusatzgewicht">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr><th className="py-1 font-medium">Übung</th><th className="font-medium">Gewicht</th><th className="font-medium">1RM</th></tr>
            </thead>
            <tbody>
              {allPRs.map(({ ex, prs }) => (
                <tr key={ex.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2 font-medium">{ex.name}</td>
                  <td>{prs.weight ? `${formatWeight(prs.weight.weight)} × ${prs.weight.reps}` : prs.bodyweightReps ? `${prs.bodyweightReps.reps} ${repsUnit(ex)}` : '–'}</td>
                  <td>{prs.e1rm ? formatWeight(Math.round(prs.e1rm.value * 10) / 10) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

/** Line dot: normal point, or a bigger point with 🏆 above it when that workout contained a PR. */
function PRDot(props: { cx?: number; cy?: number; payload?: { isPR?: boolean }; color: string }) {
  const { cx, cy, payload, color } = props
  if (cx === undefined || cy === undefined) return <g />
  if (!payload?.isPR) return <circle cx={cx} cy={cy} r={3} fill={color} stroke="var(--chart-surface)" strokeWidth={1} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={14}>🏆</text>
    </g>
  )
}
