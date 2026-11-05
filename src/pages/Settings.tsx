import { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { loadDemo, removeDemo, replaceAll, wipeAll } from '../db/actions'
import { useData } from '../db/DataProvider'
import { BackupError, buildBackup, parseBackup } from '../lib/backup'
import { todayISO } from '../lib/dates'
import { applyTheme, getTheme, type ThemeSetting } from '../lib/hooks'
import { getLastBackup, markBackupDone } from '../lib/backupReminder'

const THEMES: { key: ThemeSetting; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Hell' },
  { key: 'dark', label: 'Dunkel' },
]

export default function SettingsPage() {
  const { workouts, custom } = useData()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<ThemeSetting>(getTheme)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [lastBackup, setLastBackup] = useState(getLastBackup)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const demoCount = workouts.filter((w) => w.id.startsWith('demo-')).length

  async function exportData() {
    const backup = buildBackup(workouts, custom)
    const filename = `gym-tracker-${todayISO()}.json`
    const file = new File([JSON.stringify(backup, null, 2)], filename, { type: 'application/json' })
    try {
      // On phones the share sheet lets you save to Files / send to yourself.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Gym-Tracker Sicherung' })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      markBackupDone()
      setLastBackup(getLastBackup())
      toast('Sicherung erstellt.')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast('Export fehlgeschlagen.', 'error')
    }
  }

  async function importData(file: File) {
    try {
      const backup = parseBackup(await file.text())
      const msg = `Sicherung einspielen?\n\n${backup.workouts.length} Trainings, ${backup.exercises.length} eigene Übungen.\n\nAchtung: Alle aktuellen Daten auf diesem Gerät werden ersetzt.`
      if (!confirm(msg)) return
      await replaceAll(backup)
      toast('Sicherung eingespielt.')
    } catch (err) {
      toast(err instanceof BackupError ? err.message : 'Import fehlgeschlagen.', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Einstellungen</h1>

      <section className="card space-y-3">
        <h2 className="font-bold">Darstellung</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Farbschema">
          {THEMES.map((t) => (
            <button
              key={t.key}
              role="radio"
              aria-checked={theme === t.key}
              className={theme === t.key ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                setTheme(t.key)
                applyTheme(t.key)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Daten sichern</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Alles liegt nur auf <strong>diesem Gerät</strong> in deinem Browser. Sichere deine Daten regelmäßig als Datei – auch zum Umzug auf ein neues Handy.
        </p>
        <p className="text-sm">
          Letzte Sicherung: <strong>{lastBackup ? new Date(lastBackup).toLocaleDateString('de-DE') : 'noch nie'}</strong>
          {' · '}
          {workouts.length} Trainings, {custom.length} eigene Übungen
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" onClick={exportData}>Exportieren</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Importieren</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
        />
        <p className="text-xs text-slate-500">
          Speicher-Schutz:{' '}
          {persisted === null
            ? 'unbekannt'
            : persisted
              ? 'Der Browser darf die Daten nicht automatisch löschen.'
              : 'Der Browser könnte Daten bei Speichermangel löschen – installiere die App auf dem Home-Bildschirm und sichere regelmäßig.'}
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Demo-Daten</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ca. 12 Wochen Push/Pull/Beine-Training zum Ausprobieren des Dashboards. Sie lassen sich wieder entfernen, ohne deine eigenen Trainings anzufassen.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-secondary"
            onClick={async () => toast(`${await loadDemo()} Demo-Trainings geladen.`)}
          >
            Demo laden
          </button>
          <button
            className="btn-secondary"
            disabled={demoCount === 0}
            onClick={async () => toast(`${await removeDemo()} Demo-Trainings entfernt.`)}
          >
            Demo entfernen
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold text-red-600 dark:text-red-400">Gefahrenzone</h2>
        <button
          className="btn-danger w-full"
          onClick={async () => {
            if (!confirm('ALLE Trainings und eigenen Übungen unwiderruflich löschen?')) return
            if (!confirm('Wirklich sicher? Das kann nicht rückgängig gemacht werden. Hast du eine Sicherung?')) return
            await wipeAll()
            toast('Alle Daten gelöscht.')
          }}
        >
          Alle Daten löschen
        </button>
      </section>

      <p className="pb-4 text-center text-xs text-slate-500">Gym Tracker · MIT-Lizenz · Daten bleiben auf deinem Gerät</p>
    </div>
  )
}
