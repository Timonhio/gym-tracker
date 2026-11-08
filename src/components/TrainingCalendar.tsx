import { useMemo, useState } from 'react'
import { useData } from '../db/DataProvider'
import { trainingCalendar } from '../lib/calendar'
import { formatDate, toISODate } from '../lib/dates'
import { plural } from '../lib/format'
import { workoutDisplayName } from '../lib/session'
import type { RangeKey } from '../lib/stats'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Dot calendar for the selected range: one block per month, weeks run Monday to
 * Sunday. A big orange dot = you trained that day, a small grey dot = rest day.
 * Tap an orange dot to see which session it was.
 */
export function TrainingCalendar({ range, now }: { range: RangeKey; now: Date }) {
  const { workouts, lookup } = useData()
  const [selected, setSelected] = useState<string | null>(null)

  const cal = useMemo(() => trainingCalendar(workouts, range, now), [workouts, range, now])
  const today = toISODate(now)
  const multiYear = cal.months[0].year !== cal.months[cal.months.length - 1].year
  const columns = cal.months.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'

  const sessions = useMemo(() => {
    if (!selected) return []
    return workouts.filter((w) => w.date === selected).map((w) => workoutDisplayName(w, lookup))
  }, [selected, workouts, lookup])

  return (
    <section className="card space-y-5" aria-label="Training calendar">
      <div>
        <p className="eyebrow mb-1">Training calendar</p>
        <p className="text-sm text-slate-500">
          {cal.workouts === 0
            ? 'No workouts in this period.'
            : `${plural(cal.workouts, 'workout', 'workouts')} on ${plural(cal.trainingDays, 'day', 'days')}`}
        </p>
      </div>

      <div className={`grid ${columns} gap-x-6 gap-y-6`}>
        {cal.months.map((m) => (
          <div key={m.key}>
            <p className="mb-2.5 text-base font-semibold">
              {MONTHS[m.month]}
              {multiYear && <span className="ml-1.5 text-xs font-medium text-slate-500">{m.year}</span>}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: m.offset }, (_, i) => (
                <span key={`gap-${i}`} aria-hidden />
              ))}
              {m.days.map((d) => (
                <span key={d.date} className="flex aspect-square items-center justify-center">
                  {d.count > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelected(selected === d.date ? null : d.date)}
                      aria-label={`${formatDate(d.date)}: ${plural(d.count, 'workout', 'workouts')}`}
                      aria-pressed={selected === d.date}
                      className={`size-full rounded-full bg-[var(--accent-solid)] transition ${
                        selected === d.date ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-black' : ''
                      }`}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={`size-[36%] rounded-full bg-slate-400/45 dark:bg-slate-500/50 ${
                        d.date === today ? 'ring-1 ring-slate-500 ring-offset-2 ring-offset-white dark:ring-slate-400 dark:ring-offset-black' : ''
                      }`}
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-10 text-sm" aria-live="polite">
        {selected ? (
          <>
            <p className="font-semibold">{formatDate(selected)}</p>
            <p className="text-slate-500">{sessions.join(' · ')}</p>
          </>
        ) : (
          cal.workouts > 0 && <p className="text-slate-500">Tap an orange dot to see that session.</p>
        )}
      </div>
    </section>
  )
}
