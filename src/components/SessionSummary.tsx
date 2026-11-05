import type { SessionTargets } from '../lib/session'
import { formatNumber, formatVolume } from '../lib/format'
import { BodyMap } from './BodyMap'
import { ListIcon, RepeatIcon, WeightIcon } from './icons'

/**
 * "Today's targets": body map with the trained muscles, the list of body
 * regions and a few numbers. Used while logging and in the history.
 */
export function SessionSummary({
  targets,
  moves,
  sets,
  plannedSets,
  volume,
  prs,
  heading = 'Targets',
}: {
  targets: SessionTargets
  moves: number
  sets: number
  /** If given, sets are shown as "done/planned". */
  plannedSets?: number
  volume: number
  prs: number
  heading?: string
}) {
  return (
    <section className="space-y-3" aria-label="Session summary">
      <div className="card flex items-center gap-4 !p-4">
        <BodyMap primary={targets.primary} secondary={targets.secondary} className="h-40 shrink-0" />
        <div className="min-w-0">
          <p className="eyebrow mb-2">{heading}</p>
          {targets.regions.length === 0 ? (
            <p className="text-slate-500">Add an exercise to see what you train.</p>
          ) : (
            <ul className="space-y-1.5 text-lg font-medium">
              {targets.regions.map((r) => (
                <li key={r} className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full bg-hit" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <span className="pill">
          <ListIcon className="h-4 w-4 text-accent" />
          {moves} {moves === 1 ? 'exercise' : 'exercises'}
        </span>
        <span className="pill">
          <RepeatIcon className="h-4 w-4 text-accent" />
          {plannedSets === undefined ? sets : `${sets}/${plannedSets}`} sets
        </span>
        {volume > 0 && (
          <span className="pill">
            <WeightIcon className="h-4 w-4 text-accent" />
            {formatVolume(volume)}
          </span>
        )}
        {prs > 0 && <span className="pill">🏆 {formatNumber(prs)} {prs === 1 ? 'PR' : 'PRs'}</span>}
      </div>
    </section>
  )
}
