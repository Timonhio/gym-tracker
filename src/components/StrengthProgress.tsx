import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList, type TooltipContentProps } from 'recharts'
import { useData } from '../db/DataProvider'
import { formatDate, formatShortDate } from '../lib/dates'
import { formatTopSet, formatTopSetChange } from '../lib/format'
import { exerciseRanking, exerciseTopSets, rangeStart, type RangeKey, type TopSet } from '../lib/stats'
import { AXIS, TOOLTIP } from './chartStyle'

/** Is `a` a better top set than `b`? Heavier wins, at equal weight more reps. */
const better = (a: TopSet, b: TopSet) => a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps)

function ChangeText({ t, ex }: { t: TopSet; ex: { timed?: boolean } }) {
  if (!t.change) return <span className="text-slate-500">first time</span>
  const tone = t.change.direction === 'up' ? 'text-accent font-semibold' : 'text-slate-500'
  return <span className={tone}>{t.change.direction === 'up' ? '▲ ' : t.change.direction === 'down' ? '▼ ' : ''}{formatTopSetChange(t.change, ex)}</span>
}

/** Dot on the line: small and filled, or a hollow ring when that workout contained a PR. */
function PRDot(props: { cx?: number; cy?: number; payload?: { isPR?: boolean } }) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return <g />
  if (!payload?.isPR) return <circle cx={cx} cy={cy} r={3} fill="var(--series-1)" />
  return <circle cx={cx} cy={cy} r={6} fill="var(--chart-surface)" stroke="var(--series-1)" strokeWidth={2.5} />
}

const MAX_LABELS = 14
const COLLAPSED_ROWS = 6

/**
 * Pick an exercise and compare your sessions: for every workout the heaviest
 * weight and the most reps you managed at it (your "top set").
 */
export function StrengthProgress({ range, now }: { range: RangeKey; now: Date }) {
  const { workouts, lookup, setPRs } = useData()
  const [exerciseId, setExerciseId] = useState('')
  const [showAll, setShowAll] = useState(false)

  const trained = useMemo(() => exerciseRanking(workouts, lookup), [workouts, lookup])
  useEffect(() => {
    if (trained.length > 0 && !trained.some((t) => t.exerciseId === exerciseId)) setExerciseId(trained[0].exerciseId)
  }, [trained, exerciseId])
  useEffect(() => setShowAll(false), [exerciseId, range])

  const ex = exerciseId ? lookup(exerciseId) : null
  const tops = useMemo(() => {
    if (!ex) return []
    const start = rangeStart(range, now)
    // Changes are computed over the full history, so the first visible session still compares to the one before it.
    return exerciseTopSets(workouts, ex.id, ex.bodyweight, setPRs).filter((t) => start === null || t.date >= start)
  }, [ex, workouts, setPRs, range, now])

  if (!ex) return null

  const weighted = tops.some((t) => t.weight > 0)
  const data = tops.map((t) => ({
    ...t,
    value: weighted ? t.weight : t.reps,
    tag: weighted ? (t.weight > 0 ? `×${t.reps}` : `BW×${t.reps}`) : '',
  }))
  const latest = tops[tops.length - 1]
  const best = tops.reduce<TopSet | null>((b, t) => (!b || better(t, b) ? t : b), null)
  const rows = [...tops].reverse()
  const visibleRows = showAll ? rows : rows.slice(0, COLLAPSED_ROWS)

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const t = payload[0].payload as TopSet
    return (
      <div style={{ ...TOOLTIP.contentStyle, padding: '10px 14px' }}>
        <p style={TOOLTIP.labelStyle}>{formatDate(t.date)}</p>
        <p style={{ color: 'var(--chart-text)' }}>{formatTopSet(t, ex)}</p>
        {t.change && <p style={{ color: 'var(--chart-text-2)', fontSize: 13 }}>{formatTopSetChange(t.change, ex)} vs. previous</p>}
      </div>
    )
  }

  return (
    <section className="card space-y-4" aria-label="Strength progress">
      <div>
        <p className="eyebrow mb-1">Strength progress</p>
        <p className="text-sm text-slate-500">Your top set per workout: the heaviest weight and the most reps at that weight. Ring = PR.</p>
      </div>

      <label className="sr-only" htmlFor="progress-exercise">Exercise</label>
      <select id="progress-exercise" className="field" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
        {trained.map((t) => (
          <option key={t.exerciseId} value={t.exerciseId}>
            {t.name} ({t.workouts}×)
          </option>
        ))}
      </select>

      {tops.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No workout with this exercise in this period.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="inset !p-4">
              <p className="eyebrow mb-1.5">Latest</p>
              <p className="text-xl leading-tight font-bold tabular-nums">{formatTopSet(latest, ex)}</p>
              <p className="mt-1 text-sm">
                <ChangeText t={latest} ex={ex} />
              </p>
            </div>
            <div className="inset !p-4">
              <p className="eyebrow mb-1.5">Best in period</p>
              <p className="text-xl leading-tight font-bold tabular-nums">{best && formatTopSet(best, ex)}</p>
              <p className="mt-1 text-sm text-slate-500">{best && formatShortDate(best.date)}</p>
            </div>
          </div>

          <div className="h-60" role="img" aria-label={`Line chart: top set per workout for ${ex.name}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 22, right: 14, bottom: 0, left: -14 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  unit={weighted ? ' kg' : ''}
                  domain={[(min: number) => Math.max(0, Math.floor(min * 0.85)), (max: number) => Math.ceil(max * 1.08)]}
                />
                <Tooltip content={tooltip} cursor={{ stroke: 'var(--chart-grid)' }} />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke="var(--series-1)"
                  strokeWidth={2.5}
                  dot={<PRDot />}
                  activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                >
                  {weighted && data.length <= MAX_LABELS && (
                    <LabelList dataKey="tag" position="top" offset={10} fill="var(--chart-text-2)" fontSize={12} />
                  )}
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="eyebrow mb-1">Compared to the workout before</p>
            <ul className="divide-y divide-black/5 dark:divide-white/[0.06]">
              {visibleRows.map((t) => (
                <li key={t.workoutId} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-2.5 text-sm">
                  <span className="text-slate-500">{formatShortDate(t.date)}</span>
                  <span className="font-semibold tabular-nums">
                    {formatTopSet(t, ex)}
                    {t.isPR && <span className="tag">PR</span>}
                  </span>
                  <span className="text-right tabular-nums">
                    <ChangeText t={t} ex={ex} />
                  </span>
                </li>
              ))}
            </ul>
            {rows.length > COLLAPSED_ROWS && (
              <button className="btn-ghost mt-1 w-full" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${rows.length} workouts`}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
