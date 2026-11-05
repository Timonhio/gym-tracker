import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExerciseCard } from '../components/ExerciseCard'
import { ExerciseForm } from '../components/ExerciseForm'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlusIcon } from '../components/icons'
import { SettingsButton } from '../components/PageHeader'
import { SessionSummary } from '../components/SessionSummary'
import { useToast } from '../components/Toast'
import { saveCustomExercise, saveWorkout } from '../db/actions'
import { db } from '../db/db'
import { useData } from '../db/DataProvider'
import { formatDate, todayISO } from '../lib/dates'
import {
  draftToPreviewWorkout,
  draftToWorkout,
  incompleteSetIds,
  isDraftBlank,
  newDraftEntry,
  newDraftSet,
  workoutToDraft,
  type Draft,
} from '../lib/draft'
import { describePR, uid } from '../lib/format'
import { findLastEntry } from '../lib/history'
import { useDebounced } from '../lib/hooks'
import { computeSetPRs, currentPRs, isValidSet, setKey } from '../lib/pr'
import { entriesFromDraft, sessionTargets } from '../lib/session'
import { workoutVolume } from '../lib/stats'
import type { Exercise } from '../lib/types'

/** Re-mounts the form when switching between "new" and "edit workout X". */
export default function TrainingRoute() {
  const { id } = useParams()
  return <TrainingForm key={id ?? 'new'} editId={id} />
}

const NEW_WORKOUT_ID = 'draft'
/** A new draft counts as the latest workout of its day. */
const LATEST = Number.MAX_SAFE_INTEGER

function TrainingForm({ editId }: { editId?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { workouts, catalog, lookup, isBodyweight } = useData()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [createdAt, setCreatedAt] = useState(LATEST)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  // ---- load: existing workout (edit) or the saved draft (new) -------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (editId) {
        const w = await db.workouts.get(editId)
        if (cancelled) return
        if (!w) {
          toast('Workout not found.', 'error')
          navigate('/history', { replace: true })
          return
        }
        setCreatedAt(w.createdAt)
        setDraft(workoutToDraft(w))
      } else {
        const saved = await db.drafts.get('current')
        if (cancelled) return
        // A draft without any exercise is just "nothing yet" -> always today.
        setDraft(
          saved && saved.entries.length > 0
            ? { name: saved.name ?? '', date: saved.date, entries: saved.entries }
            : { name: '', date: todayISO(), entries: [] },
        )
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // ---- keep the new-training draft in IndexedDB (survives reloads) --------
  useEffect(() => {
    if (!draft || editId) return
    if (draft.entries.length === 0) void db.drafts.delete('current')
    else void db.drafts.put({ id: 'current', ...draft })
  }, [draft, editId])

  // ---- PR preview ----------------------------------------------------------
  const previewId = editId ?? NEW_WORKOUT_ID
  const history = useMemo(() => workouts.filter((w) => w.id !== editId), [workouts, editId])
  const preview = useMemo(() => (draft ? draftToPreviewWorkout(draft, previewId, createdAt) : null), [draft, previewId, createdAt])
  const withPreview = useMemo(() => (preview ? [...history, preview] : history), [history, preview])
  const livePRs = useMemo(() => computeSetPRs(withPreview, isBodyweight), [withPreview, isBodyweight])

  // Toasts: wait until the user stopped typing so "8" -> "85" only announces 85.
  const settled = useDebounced(preview, 700)
  const settledPRs = useMemo(
    () => (settled ? computeSetPRs([...history, settled], isBodyweight) : null),
    [history, settled, isBodyweight],
  )
  const announced = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!settled || !settledPRs) return
    const fresh: { text: string }[] = []
    // First run after loading only records what already exists (no toasts).
    const baseline = announced.current === null
    const seen = announced.current ?? new Set<string>()
    announced.current = seen
    for (const entry of settled.entries) {
      for (const set of entry.sets) {
        const types = settledPRs.get(setKey(previewId, set.id))
        if (!types) continue
        const sig = `${set.id}|${types.join()}|${set.reps}|${set.weight}`
        if (seen.has(sig)) continue
        seen.add(sig)
        if (!baseline) fresh.push({ text: describePR(types, set, lookup(entry.exerciseId)) })
      }
    }
    fresh.slice(0, 3).forEach((f) => toast(f.text, 'pr'))
    if (fresh.length > 3) toast(`… and ${fresh.length - 3} more PRs`, 'pr')
  }, [settled, settledPRs, previewId, lookup, toast])

  const incompleteIds = useMemo(() => (draft ? incompleteSetIds(draft, isBodyweight) : new Set<string>()), [draft, isBodyweight])

  // ---- session summary -----------------------------------------------------
  const targets = useMemo(() => (draft ? sessionTargets(entriesFromDraft(draft), lookup) : null), [draft, lookup])

  // The session title is a textarea so long names wrap instead of being cut off.
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const titleText = draft ? draft.name || targets?.name || '' : ''
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [titleText, draft === null])
  const stats = useMemo(() => {
    if (!preview) return { done: 0, planned: 0, volume: 0, prs: 0 }
    let done = 0
    let planned = 0
    let prs = 0
    for (const e of preview.entries) {
      for (const s of e.sets) {
        planned++
        if (isValidSet(s, isBodyweight(e.exerciseId))) done++
        if (livePRs.has(setKey(previewId, s.id))) prs++
      }
    }
    return { done, planned, volume: workoutVolume(preview, isBodyweight), prs }
  }, [preview, livePRs, previewId, isBodyweight])

  if (!draft || !preview || !targets) return <p className="py-10 text-center text-slate-500">Loading…</p>

  // ---- handlers --------------------------------------------------------------
  const update = (fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d))

  const addExercise = (e: Exercise) => {
    update((d) => ({ ...d, entries: [...d.entries, newDraftEntry(e.id)] }))
    setPickerOpen(false)
  }
  const patchEntry = (idx: number, fn: (e: Draft['entries'][number]) => Draft['entries'][number]) =>
    update((d) => ({ ...d, entries: d.entries.map((e, i) => (i === idx ? fn(e) : e)) }))

  async function save() {
    if (!draft) return
    if (incompleteIds.size > 0) {
      setShowErrors(true)
      toast('Fill in or delete the incomplete sets first.', 'error')
      return
    }
    const workout = draftToWorkout(draft, editId ?? uid(), editId ? createdAt : Date.now(), isBodyweight)
    if (workout.entries.length === 0) {
      toast('No set filled in yet – nothing to save.', 'error')
      return
    }
    setSaving(true)
    await saveWorkout(workout)
    if (!editId) await db.drafts.delete('current')
    toast(editId ? 'Changes saved.' : 'Workout saved.')
    navigate('/history')
  }

  function discard() {
    if (editId) return navigate('/history')
    if (!isDraftBlank(draft!) && !confirm('Discard the current workout?')) return
    setDraft({ name: '', date: todayISO(), entries: [] })
    announced.current = null
  }

  const usedIds = new Set(draft.entries.map((e) => e.exerciseId))
  const isToday = draft.date === todayISO()
  const customName = draft.name.trim() !== '' && draft.name.trim() !== targets.name

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* date pill: tapping it opens the native date picker */}
          <label className="eyebrow relative mb-1 inline-flex cursor-pointer items-center gap-1.5">
            {editId ? 'Editing · ' : ''}
            {isToday ? 'Today' : formatDate(draft.date)}
            <span aria-hidden="true">▾</span>
            <input
              type="date"
              aria-label="Workout date"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={draft.date}
              onChange={(e) => e.target.value && update((d) => ({ ...d, date: e.target.value }))}
            />
          </label>
          <textarea
            ref={titleRef}
            rows={1}
            aria-label="Session name"
            className="block w-full min-w-0 resize-none overflow-hidden bg-transparent text-3xl leading-tight font-bold tracking-tight outline-none placeholder:text-slate-500"
            value={titleText}
            maxLength={80}
            placeholder="New session"
            onChange={(e) => update((d) => ({ ...d, name: e.target.value === targets.name ? '' : e.target.value.replace(/\n/g, ' ') }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
          {customName && (
            <button className="mt-1 text-sm text-slate-500 underline" onClick={() => update((d) => ({ ...d, name: '' }))}>
              Use suggested name
            </button>
          )}
        </div>
        <div className="pt-0.5">
          <SettingsButton />
        </div>
      </header>

      {draft.entries.length === 0 ? (
        <div className="card text-center">
          <p className="text-lg font-semibold">No exercises yet</p>
          <p className="mt-1 text-slate-500">Add your first exercise – the session gets its name automatically.</p>
        </div>
      ) : (
        <SessionSummary
          targets={targets}
          moves={draft.entries.length}
          sets={stats.done}
          plannedSets={stats.planned}
          volume={stats.volume}
          prs={stats.prs}
          heading="Today’s targets"
        />
      )}

      {draft.entries.length > 0 && <p className="eyebrow pt-1">Exercises</p>}

      {draft.entries.map((entry, idx) => {
        const ex = lookup(entry.exerciseId)
        return (
          <ExerciseCard
            key={entry.exerciseId}
            index={idx + 1}
            entry={entry}
            exercise={ex}
            prs={currentPRs(withPreview, entry.exerciseId, ex.bodyweight)}
            last={findLastEntry(history, entry.exerciseId, preview, ex.bodyweight)}
            setPRs={(setId) => livePRs.get(setKey(previewId, setId))}
            incompleteIds={showErrors ? incompleteIds : new Set()}
            onChange={(setId, field, value) =>
              patchEntry(idx, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }))
            }
            onAddSet={() => patchEntry(idx, (e) => ({ ...e, sets: [...e.sets, newDraftSet()] }))}
            onRemoveSet={(setId) => patchEntry(idx, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))}
            onRemove={() => {
              const hasData = entry.sets.some((s) => s.reps || s.weight)
              if (hasData && !confirm(`Remove ${ex.name} from this workout?`)) return
              update((d) => ({ ...d, entries: d.entries.filter((_, i) => i !== idx) }))
            }}
          />
        )
      })}

      <button className="btn-secondary w-full" onClick={() => setPickerOpen(true)}>
        <PlusIcon className="h-5 w-5" /> Add exercise
      </button>

      <div className="flex justify-center">
        <button className="btn-ghost" onClick={discard}>
          {editId ? 'Cancel' : 'Discard workout'}
        </button>
      </div>

      {/* floating primary action above the navigation */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 bg-gradient-to-t from-slate-100 via-slate-100/80 to-transparent px-5 pt-8 dark:from-black dark:via-black/80"
        style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="pointer-events-auto mx-auto max-w-sm pb-2">
          <button className="btn-primary w-full !min-h-14 text-lg shadow-lg" onClick={save} disabled={saving || draft.entries.length === 0}>
            {editId ? 'Save changes' : 'Save workout'}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker
          catalog={catalog}
          usedIds={usedIds}
          onSelect={addExercise}
          onCreate={() => setCreating(true)}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {creating && (
        <ExerciseForm
          catalog={catalog}
          onClose={() => setCreating(false)}
          onSave={async (e) => {
            await saveCustomExercise(e)
            setCreating(false)
            addExercise(e)
            toast(`“${e.name}” created.`)
          }}
        />
      )}
    </div>
  )
}
