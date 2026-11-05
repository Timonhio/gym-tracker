import { useState } from 'react'
import { normalize } from '../lib/search'
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type MuscleGroup } from '../lib/types'
import { uid } from '../lib/format'
import { Modal } from './Modal'

/** Create or edit a custom exercise. */
export function ExerciseForm({
  initial,
  catalog,
  onSave,
  onClose,
}: {
  initial?: Exercise
  catalog: Exercise[]
  onSave: (e: Exercise) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [primary, setPrimary] = useState<MuscleGroup>(initial?.primary ?? 'Brust')
  const [secondary, setSecondary] = useState<MuscleGroup[]>(initial?.secondary ?? [])
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'Kurzhantel')
  const [bodyweight, setBodyweight] = useState(initial?.bodyweight ?? false)
  const [timed, setTimed] = useState(initial?.timed ?? false)
  const [error, setError] = useState('')

  function toggleSecondary(g: MuscleGroup) {
    setSecondary((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Bitte gib einen Namen ein.')
    const clash = catalog.some((e) => e.id !== initial?.id && normalize(e.name) === normalize(trimmed))
    if (clash) return setError('Eine Übung mit diesem Namen gibt es schon.')
    onSave({
      id: initial?.id ?? `custom-${uid()}`,
      name: trimmed,
      primary,
      secondary: secondary.filter((g) => g !== primary),
      equipment,
      bodyweight: bodyweight || equipment === 'Körpergewicht',
      ...(timed ? { timed: true } : {}),
      custom: true,
    })
  }

  return (
    <Modal
      title={initial ? 'Übung bearbeiten' : 'Eigene Übung'}
      onClose={onClose}
      footer={
        <button className="btn-primary w-full" onClick={submit}>
          Speichern
        </button>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="label" htmlFor="ex-name">Name</label>
          <input id="ex-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Kabel-Flys" autoFocus />
        </div>

        <div>
          <label className="label" htmlFor="ex-primary">Hauptmuskelgruppe</label>
          <select id="ex-primary" className="field" value={primary} onChange={(e) => setPrimary(e.target.value as MuscleGroup)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">Weitere Muskelgruppen (optional)</span>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.filter((g) => g !== primary).map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${secondary.includes(g) ? 'chip-active' : ''}`}
                onClick={() => toggleSecondary(g)}
                aria-pressed={secondary.includes(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ex-equipment">Equipment</label>
          <select
            id="ex-equipment"
            className="field"
            value={equipment}
            onChange={(e) => {
              const v = e.target.value as Equipment
              setEquipment(v)
              if (v === 'Körpergewicht') setBodyweight(true)
            }}
          >
            {EQUIPMENT.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={bodyweight} onChange={(e) => setBodyweight(e.target.checked)} />
          <span>Körpergewichtsübung <span className="text-slate-500">(Gewicht optional)</span></span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          <span>Zeitbasiert <span className="text-slate-500">(Sekunden statt Wdh.)</span></span>
        </label>

        {error && <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      </div>
    </Modal>
  )
}
