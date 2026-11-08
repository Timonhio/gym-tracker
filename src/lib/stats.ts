import { addDays, diffDays, parseISODate, startOfWeek, toISODate } from './dates'
import { MOVEMENT_OF, REGIONS, REGION_OF, type Movement, type Region } from './exercises'
import { compareWorkouts, epley1RM, isValidSet, setKey, type SetPRMap } from './pr'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup, type PRType, type Workout } from './types'

type Lookup = (id: string) => Exercise

// ---- time ranges -------------------------------------------------------------

export type RangeKey = '4w' | '3m' | '1y' | 'all'
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '4w', label: '4 weeks', days: 28 },
  { key: '3m', label: '3 months', days: 91 },
  { key: '1y', label: '1 year', days: 365 },
  { key: 'all', label: 'All', days: null },
]
const daysOf = (r: RangeKey) => RANGES.find((x) => x.key === r)!.days

/** First day (YYYY-MM-DD) of the range, today included. null = no limit. */
export function rangeStart(range: RangeKey, now: Date): string | null {
  const days = daysOf(range)
  return days === null ? null : toISODate(addDays(now, -(days - 1)))
}

export function inRange(workouts: Workout[], range: RangeKey, now: Date): Workout[] {
  const start = rangeStart(range, now)
  const end = toISODate(now)
  return workouts.filter((w) => (start === null || w.date >= start) && w.date <= end)
}

/** The period of equal length directly before the range (null for "all"). */
export function previousPeriod(workouts: Workout[], range: RangeKey, now: Date): Workout[] | null {
  const days = daysOf(range)
  if (days === null) return null
  const start = toISODate(addDays(now, -(days - 1)))
  const prevStart = toISODate(addDays(now, -(2 * days - 1)))
  return workouts.filter((w) => w.date >= prevStart && w.date < start)
}

// ---- volume --------------------------------------------------------------------

/** Σ sets × reps × weight (bodyweight sets without added weight count 0). */
export function workoutVolume(w: Workout, isBodyweight: (id: string) => boolean): number {
  let v = 0
  for (const e of w.entries) {
    const bw = isBodyweight(e.exerciseId)
    for (const s of e.sets) if (isValidSet(s, bw)) v += (s.reps as number) * (s.weight ?? 0)
  }
  return v
}

export function totalVolume(workouts: Workout[], isBodyweight: (id: string) => boolean): number {
  return workouts.reduce((sum, w) => sum + workoutVolume(w, isBodyweight), 0)
}

export function countValidSets(w: Workout, isBodyweight: (id: string) => boolean): number {
  return w.entries.reduce((n, e) => n + e.sets.filter((s) => isValidSet(s, isBodyweight(e.exerciseId))).length, 0)
}

export interface VolumeTrend {
  current: number
  previous: number | null
  /** Percent change vs. previous period; null if there is nothing to compare. */
  changePct: number | null
}
export function volumeTrend(
  workouts: Workout[],
  range: RangeKey,
  now: Date,
  isBodyweight: (id: string) => boolean,
): VolumeTrend {
  const current = totalVolume(inRange(workouts, range, now), isBodyweight)
  const prevWorkouts = previousPeriod(workouts, range, now)
  if (!prevWorkouts) return { current, previous: null, changePct: null }
  const previous = totalVolume(prevWorkouts, isBodyweight)
  return { current, previous, changePct: previous > 0 ? ((current - previous) / previous) * 100 : null }
}

// ---- frequency -----------------------------------------------------------------

export interface WeekBucket {
  /** Monday of the week, YYYY-MM-DD */
  weekStart: string
  count: number
}

/** Workouts per calendar week (Mon–Sun), including weeks with 0. */
export function workoutsPerWeek(workouts: Workout[], range: RangeKey, now: Date): WeekBucket[] {
  const rs = rangeStart(range, now)
  let first: Date
  if (rs) first = startOfWeek(parseISODate(rs))
  else {
    if (workouts.length === 0) return []
    first = startOfWeek(parseISODate(workouts.reduce((m, w) => (w.date < m ? w.date : m), workouts[0].date)))
  }
  const counts = new Map<string, number>()
  for (const w of workouts) {
    const k = toISODate(startOfWeek(parseISODate(w.date)))
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const out: WeekBucket[] = []
  const last = startOfWeek(now)
  for (let d = first; d <= last; d = addDays(d, 7)) {
    const k = toISODate(d)
    out.push({ weekStart: k, count: counts.get(k) ?? 0 })
  }
  return out
}

/**
 * Streak in WEEKS: consecutive calendar weeks with at least one workout.
 * The current week doesn't break the streak just because it hasn't had its
 * workout yet.
 */
export function weeklyStreak(workouts: Workout[], now: Date): { current: number; longest: number } {
  const weeks = new Set(workouts.map((w) => toISODate(startOfWeek(parseISODate(w.date)))))
  const thisWeek = startOfWeek(now)
  let cursor = weeks.has(toISODate(thisWeek)) ? thisWeek : addDays(thisWeek, -7)
  let current = 0
  while (weeks.has(toISODate(cursor))) {
    current++
    cursor = addDays(cursor, -7)
  }

  const sorted = [...weeks].sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && diffDays(parseISODate(sorted[i - 1]), parseISODate(sorted[i])) === 7 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  return { current, longest }
}

/** Counts per weekday, Monday first. */
export function weekdayCounts(workouts: Workout[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const w of workouts) counts[(parseISODate(w.date).getDay() + 6) % 7]++
  return counts
}

// ---- exercises & muscles ---------------------------------------------------------

export interface RankedExercise {
  exerciseId: string
  name: string
  workouts: number
  sets: number
}
/** Which exercise was done how often (number of workouts it appeared in). */
export function exerciseRanking(workouts: Workout[], lookup: Lookup): RankedExercise[] {
  const map = new Map<string, RankedExercise>()
  for (const w of workouts) {
    for (const e of w.entries) {
      const ex = lookup(e.exerciseId)
      const sets = e.sets.filter((s) => isValidSet(s, ex.bodyweight)).length
      if (sets === 0) continue
      const r = map.get(e.exerciseId) ?? { exerciseId: e.exerciseId, name: ex.name, workouts: 0, sets: 0 }
      r.workouts++
      r.sets += sets
      map.set(e.exerciseId, r)
    }
  }
  return [...map.values()].sort((a, b) => b.workouts - a.workouts || b.sets - a.sets || a.name.localeCompare(b.name, 'en'))
}

/** Valid sets per PRIMARY muscle group. */
export function setsByMuscle(workouts: Workout[], lookup: Lookup): { muscle: MuscleGroup; sets: number }[] {
  const map = new Map<MuscleGroup, number>()
  for (const w of workouts) {
    for (const e of w.entries) {
      const ex = lookup(e.exerciseId)
      const n = e.sets.filter((s) => isValidSet(s, ex.bodyweight)).length
      if (n > 0) map.set(ex.primary, (map.get(ex.primary) ?? 0) + n)
    }
  }
  // Ties: keep the fixed muscle order so the chart doesn't jump around.
  return [...map.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets || MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle))
}

export interface RegionRecency {
  region: Region
  lastDate: string | null
  /** Days since last trained; null = never. */
  days: number | null
}
/** How long ago each body region (primary muscle) was last trained. */
export function regionRecency(workouts: Workout[], lookup: Lookup, now: Date): RegionRecency[] {
  const last = new Map<Region, string>()
  for (const w of workouts) {
    for (const e of w.entries) {
      const ex = lookup(e.exerciseId)
      if (!e.sets.some((s) => isValidSet(s, ex.bodyweight))) continue
      const r = REGION_OF[ex.primary]
      if (!last.has(r) || w.date > last.get(r)!) last.set(r, w.date)
    }
  }
  return REGIONS.map((region) => {
    const lastDate = last.get(region) ?? null
    return { region, lastDate, days: lastDate ? diffDays(parseISODate(lastDate), now) : null }
  })
}

export interface MovementBalance {
  counts: Record<Movement, number>
  /** push / pull, null if no pulling sets */
  pushPullRatio: number | null
}
/** Sets by movement pattern (push / pull / legs / core), via the primary muscle. */
export function movementBalance(workouts: Workout[], lookup: Lookup): MovementBalance {
  const counts: Record<Movement, number> = { Push: 0, Pull: 0, Legs: 0, Core: 0 }
  for (const { muscle, sets } of setsByMuscle(workouts, lookup)) {
    const movement = MOVEMENT_OF[muscle]
    if (movement) counts[movement] += sets
  }
  return { counts, pushPullRatio: counts.Pull > 0 ? counts.Push / counts.Pull : null }
}

// ---- progress & PRs ----------------------------------------------------------------

export interface ProgressPoint {
  date: string
  workoutId: string
  topWeight: number | null
  e1rm: number | null
  /** Most reps in a set without added weight (bodyweight exercises). */
  maxBodyweightReps: number | null
  isPR: boolean
}

/** One point per workout for one exercise (chronological). */
export function exerciseProgress(
  workouts: Workout[],
  exerciseId: string,
  bodyweight: boolean,
  setPRs: SetPRMap,
): ProgressPoint[] {
  const points: ProgressPoint[] = []
  for (const w of [...workouts].sort(compareWorkouts)) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry) continue
    let topWeight: number | null = null
    let e1rm: number | null = null
    let maxBw: number | null = null
    let valid = false
    let isPR = false
    for (const s of entry.sets) {
      if (!isValidSet(s, bodyweight)) continue
      valid = true
      const weight = s.weight ?? 0
      const reps = s.reps as number
      if (weight > 0) {
        topWeight = Math.max(topWeight ?? 0, weight)
        e1rm = Math.max(e1rm ?? 0, epley1RM(weight, reps))
      } else maxBw = Math.max(maxBw ?? 0, reps)
      const prs = setPRs.get(setKey(w.id, s.id))
      if (prs && prs.length > 0) isPR = true
    }
    if (valid) points.push({ date: w.date, workoutId: w.id, topWeight, e1rm, maxBodyweightReps: maxBw, isPR })
  }
  return points
}

export interface TopSetChange {
  direction: 'up' | 'down' | 'same'
  /** kg, this session minus the previous one */
  weightDelta: number
  /** reps, this session minus the previous one */
  repsDelta: number
}

/** The best set of one exercise in one workout: heaviest weight, then most reps at that weight. */
export interface TopSet {
  date: string
  workoutId: string
  /** Heaviest weight of the session. 0 = no added weight (bodyweight / timed exercises). */
  weight: number
  /** Most reps (or seconds) at that weight. */
  reps: number
  /** The workout contained a PR for this exercise. */
  isPR: boolean
  /** Compared with the previous workout that had this exercise; null for the first one. */
  change: TopSetChange | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * One top set per workout for one exercise (chronological), so that sessions can
 * be compared directly: first by weight, at the same weight by reps.
 */
export function exerciseTopSets(workouts: Workout[], exerciseId: string, bodyweight: boolean, setPRs: SetPRMap): TopSet[] {
  const out: TopSet[] = []
  for (const w of [...workouts].sort(compareWorkouts)) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry) continue
    let best: { weight: number; reps: number } | null = null
    let isPR = false
    for (const s of entry.sets) {
      if (!isValidSet(s, bodyweight)) continue
      const weight = s.weight ?? 0
      const reps = s.reps as number
      if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) best = { weight, reps }
      if ((setPRs.get(setKey(w.id, s.id))?.length ?? 0) > 0) isPR = true
    }
    if (!best) continue
    const prev = out[out.length - 1]
    let change: TopSetChange | null = null
    if (prev) {
      const weightDelta = round2(best.weight - prev.weight)
      const repsDelta = best.reps - prev.reps
      const direction = weightDelta > 0 || (weightDelta === 0 && repsDelta > 0) ? 'up' : weightDelta < 0 || repsDelta < 0 ? 'down' : 'same'
      change = { direction, weightDelta, repsDelta }
    }
    out.push({ date: w.date, workoutId: w.id, weight: best.weight, reps: best.reps, isPR, change })
  }
  return out
}

export interface LatestPR {
  date: string
  workoutId: string
  exerciseId: string
  exerciseName: string
  types: PRType[]
  reps: number
  weight: number | null
}

/**
 * Newest PRs, one line per exercise per workout (the strongest PR set of that
 * session), newest first.
 */
export function latestPRs(workouts: Workout[], setPRs: SetPRMap, lookup: Lookup, limit = 8): LatestPR[] {
  const out: LatestPR[] = []
  for (const w of [...workouts].sort(compareWorkouts).reverse()) {
    for (const e of w.entries) {
      let best: LatestPR | null = null
      let bestScore = -1
      const types = new Set<PRType>()
      for (const s of e.sets) {
        const t = setPRs.get(setKey(w.id, s.id))
        if (!t) continue
        t.forEach((x) => types.add(x))
        const score = epley1RM(s.weight ?? 0, s.reps ?? 0) || (s.reps ?? 0)
        if (score >= bestScore) {
          bestScore = score
          best = {
            date: w.date,
            workoutId: w.id,
            exerciseId: e.exerciseId,
            exerciseName: lookup(e.exerciseId).name,
            types: [],
            reps: s.reps ?? 0,
            weight: s.weight,
          }
        }
      }
      if (best) out.push({ ...best, types: [...types] })
      if (out.length >= limit) return out
    }
  }
  return out
}
