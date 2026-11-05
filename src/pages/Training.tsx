import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExerciseCard } from '../components/ExerciseCard'
import { ExerciseForm } from '../components/ExerciseForm'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlusIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { saveCustomExercise, saveWorkout } from '../db/actions'
import { db } from '../db/db'
import { useData } from '../db/DataProvider'
import { todayISO } from '../lib/dates'
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
import { computeSetPRs, currentPRs, setKey } from '../lib/pr'
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
          toast('Training nicht gefunden.', 'error')
          navigate('/history', { replace: true })
          return
        }
        setCreatedAt(w.createdAt)
        setDraft(workoutToDraft(w))
      } else {
        const saved = await db.drafts.get('current')
        if (cancelled) return
        // A draft without any exercise is just "nothing yet" -> always today.
        setDraft(saved && saved.entries.length > 0 ? { date: saved.date, entries: saved.entries } : { date: todayISO(), entries: [] })
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
    if (fresh.length > 3) toast(`… und ${fresh.length - 3} weitere PRs`, 'pr')
  }, [settled, settledPRs, previewId, lookup, toast])

  const incompleteIds = useMemo(() => (draft ? incompleteSetIds(draft, isBodyweight) : new Set<string>()), [draft, isBodyweight])

  if (!draft || !preview) return <p className="py-10 text-center text-slate-500">Lade …</p>

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
      toast('Bitte unvollständige Sätze ausfüllen oder löschen.', 'error')
      return
    }
    const workout = draftToWorkout(draft, editId ?? uid(), editId ? createdAt : Date.now(), isBodyweight)
    if (workout.entries.length === 0) {
      toast('Noch kein Satz ausgefüllt – es gibt nichts zu speichern.', 'error')
      return
    }
    setSaving(true)
    await saveWorkout(workout)
    if (!editId) await db.drafts.delete('current')
    toast(editId ? 'Änderungen gespeichert.' : 'Training gespeichert 💪')
    navigate('/history')
  }

  function discard() {
    if (editId) return navigate('/history')
    if (!isDraftBlank(draft!) && !confirm('Das laufende Training verwerfen?')) return
    setDraft({ date: todayISO(), entries: [] })
    announced.current = null
  }

  const usedIds = new Set(draft.entries.map((e) => e.exerciseId))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{editId ? 'Training bearbeiten' : 'Neues Training'}</h1>
        <div>
          <label className="sr-only" htmlFor="date">Datum</label>
          <input
            id="date"
            type="date"
            className="field !w-auto"
            value={draft.date}
            max="9999-12-31"
            onChange={(e) => e.target.value && update((d) => ({ ...d, date: e.target.value }))}
          />
        </div>
      </div>

      {draft.entries.length === 0 && (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Los geht’s 💪</p>
          <p className="mt-1">Füge deine erste Übung hinzu.</p>
        </div>
      )}

      {draft.entries.map((entry, idx) => {
        const ex = lookup(entry.exerciseId)
        return (
          <ExerciseCard
            key={entry.exerciseId}
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
              if (hasData && !confirm(`${ex.name} aus dem Training entfernen?`)) return
              update((d) => ({ ...d, entries: d.entries.filter((_, i) => i !== idx) }))
            }}
          />
        )
      })}

      <button className="btn-secondary w-full !min-h-14 text-lg" onClick={() => setPickerOpen(true)}>
        <PlusIcon /> Übung hinzufügen
      </button>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={discard}>
          {editId ? 'Abbrechen' : 'Verwerfen'}
        </button>
      </div>

      {/* sticky save bar above the bottom navigation */}
      <div
        className="fixed inset-x-0 z-30 px-4"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        <div className="mx-auto max-w-xl">
          <button className="btn-primary w-full !min-h-14 text-lg shadow-lg" onClick={save} disabled={saving || draft.entries.length === 0}>
            {editId ? 'Änderungen speichern' : 'Training speichern'}
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
            toast(`„${e.name}“ angelegt.`)
          }}
        />
      )}
    </div>
  )
}
