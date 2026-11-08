import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { deleteBodyWeight, saveBodyWeight } from '../db/actions'
import { useData } from '../db/DataProvider'
import {
  bodyWeightAxis,
  bodyWeightChange,
  bodyWeightsInRange,
  latestBodyWeight,
  niceWeightTicks,
  parseBodyWeight,
  sortBodyWeights,
} from '../lib/bodyweight'
import { diffDays, formatDate, formatShortDate, parseISODate, todayISO, toISODate } from '../lib/dates'
import { formatNumber } from '../lib/format'
import type { RangeKey } from '../lib/stats'
import { AXIS, TOOLTIP } from './chartStyle'
import { XIcon } from './icons'
import { useToast } from './Toast'

function ago(date: string, now: Date): string {
  const d = diffDays(parseISODate(date), now)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/** Log your body weight now and then and see the trend. */
export function BodyWeightCard({ range, now }: { range: RangeKey; now: Date }) {
  const { bodyWeights } = useData()
  const toast = useToast()
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayISO())
  const [logging, setLogging] = useState(false)

  const latest = useMemo(() => latestBodyWeight(bodyWeights), [bodyWeights])
  const change = useMemo(() => bodyWeightChange(bodyWeights, range, now), [bodyWeights, range, now])
  const points = useMemo(() => bodyWeightsInRange(bodyWeights, range, now), [bodyWeights, range, now])
  const all = useMemo(() => sortBodyWeights(bodyWeights).reverse(), [bodyWeights])
  const ticks = useMemo(() => (points.length ? niceWeightTicks(Math.min(...points.map((p) => p.kg)), Math.max(...points.map((p) => p.kg))) : []), [points])
  const axis = useMemo(() => bodyWeightAxis(points, range, now), [points, range, now])
  const data = useMemo(() => points.map((p) => ({ ...p, t: parseISODate(p.date).getTime() })), [points])
  const lowest = points.length ? Math.min(...points.map((p) => p.kg)) : null
  const highest = points.length ? Math.max(...points.map((p) => p.kg)) : null

  async function log() {
    const kg = parseBodyWeight(text)
    if (kg === null) return toast('Enter a weight between 20 and 400 kg.', 'error')
    await saveBodyWeight(date, kg)
    setText('')
    setLogging(false)
    toast(`Logged ${formatNumber(kg)} kg.`)
  }

  return (
    <section className="card space-y-4" aria-label="Body weight">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Body weight</p>
          {latest ? (
            <>
              <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
                {formatNumber(latest.kg)} <span className="text-lg font-medium text-slate-500">kg</span>
              </p>
              <p className="mt-1.5 text-sm text-slate-500">{ago(latest.date, now)}</p>
            </>
          ) : (
            <p className="text-slate-500">No measurements yet.</p>
          )}
        </div>
        {change && (
          <span className="pill !py-1.5 tabular-nums" title={`${formatDate(change.from.date)} → ${formatDate(change.to.date)}`}>
            {change.delta > 0 ? '+' : change.delta < 0 ? '−' : ''}
            {formatNumber(Math.abs(change.delta))} kg
          </span>
        )}
      </div>

      {points.length > 0 ? (
        <>
          <div className="h-56" role="img" aria-label="Chart: body weight over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="bw-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={axis.domain}
                  ticks={axis.ticks}
                  tickFormatter={(t) => formatShortDate(toISODate(new Date(Number(t))))}
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 6, right: 6 }}
                />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
                <Tooltip
                  {...TOOLTIP}
                  cursor={{ stroke: 'var(--chart-grid)' }}
                  labelFormatter={(t) => formatDate(toISODate(new Date(Number(t))))}
                  formatter={(v) => [`${formatNumber(Number(v))} kg`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="kg"
                  name="Weight"
                  stroke="var(--series-1)"
                  strokeWidth={2.5}
                  fill="url(#bw-fill)"
                  dot={{ r: 3.5, fill: 'var(--series-1)', stroke: 'var(--chart-surface)', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {points.length >= 2 && lowest !== null && highest !== null && (
            <dl className="grid grid-cols-3 gap-3 text-center text-sm">
              {[
                ['Lowest', lowest],
                ['Average', points.reduce((sum, p) => sum + p.kg, 0) / points.length],
                ['Highest', highest],
              ].map(([label, kg]) => (
                <div key={label as string} className="inset !p-3">
                  <dt className="eyebrow mb-1">{label}</dt>
                  <dd className="font-semibold tabular-nums">{formatNumber(Math.round(Number(kg) * 10) / 10)} kg</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        latest && <p className="text-sm text-slate-500">No measurements in this period. Pick a longer range to see your trend.</p>
      )}

      {logging ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void log()
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              className="field"
              inputMode="decimal"
              placeholder="Weight (kg)"
              aria-label="Body weight in kg"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            />
            <input className="field" type="date" aria-label="Date of measurement" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => setLogging(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!text}>
              Save
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-secondary w-full" onClick={() => setLogging(true)}>
          Log weight
        </button>
      )}

      {all.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer list-none text-slate-500">All measurements ({all.length}) ▾</summary>
          <ul className="mt-2 divide-y divide-black/5 dark:divide-white/[0.06]">
            {all.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <span className="text-slate-500">{formatDate(e.date)}</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold tabular-nums">{formatNumber(e.kg)} kg</span>
                  <button
                    className="btn-icon !size-9 !bg-transparent text-slate-500"
                    aria-label={`Delete measurement from ${formatDate(e.date)}`}
                    onClick={async () => {
                      await deleteBodyWeight(e.id)
                      toast('Measurement deleted.')
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
