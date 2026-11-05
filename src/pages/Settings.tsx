import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { loadDemo, removeDemo, replaceAll, wipeAll } from '../db/actions'
import { useData } from '../db/DataProvider'
import { BackupError, buildBackup, parseBackup, type BackupPhoto } from '../lib/backup'
import { getLastBackup, markBackupDone } from '../lib/backupReminder'
import { todayISO } from '../lib/dates'
import { plural } from '../lib/format'
import { applyTheme, getTheme, type ThemeSetting } from '../lib/hooks'
import { blobToDataURL } from '../lib/image'

const THEMES: { key: ThemeSetting; label: string }[] = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
  { key: 'system', label: 'System' },
]

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { workouts, custom, bodyWeights, photos } = useData()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<ThemeSetting>(getTheme)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [lastBackup, setLastBackup] = useState(getLastBackup)
  const [withPhotos, setWithPhotos] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const demoCount = workouts.filter((w) => w.id.startsWith('demo-')).length

  async function exportData() {
    setBusy(true)
    try {
      const encoded: BackupPhoto[] = withPhotos
        ? await Promise.all(
            photos.map(async (p) => ({
              id: p.id,
              date: p.date,
              createdAt: p.createdAt,
              ...(p.note ? { note: p.note } : {}),
              full: await blobToDataURL(p.full),
              thumb: await blobToDataURL(p.thumb),
            })),
          )
        : []
      const backup = buildBackup({ workouts, exercises: custom, bodyWeights, photos: encoded })
      const filename = `gym-tracker-${todayISO()}.json`
      const file = new File([JSON.stringify(backup)], filename, { type: 'application/json' })
      // On phones the share sheet lets you save to Files / send to yourself.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Gym Tracker backup' })
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
      toast('Backup created.')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast('Export failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function importData(file: File) {
    try {
      const backup = parseBackup(await file.text())
      const msg =
        `Restore this backup?\n\n${plural(backup.workouts.length, 'workout', 'workouts')}, ` +
        `${plural(backup.exercises.length, 'custom exercise', 'custom exercises')}, ` +
        `${plural(backup.bodyWeights.length, 'weight entry', 'weight entries')}, ${plural(backup.photos.length, 'photo', 'photos')}.\n\n` +
        'Warning: all current data on this device will be replaced.'
      if (!confirm(msg)) return
      await replaceAll(backup)
      toast('Backup restored.')
    } catch (err) {
      toast(err instanceof BackupError ? err.message : 'Import failed.', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader title="Settings" hideSettings />

      <div className="space-y-4">
        <Group title="Appearance">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-slate-200 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Color scheme">
            {THEMES.map((t) => (
              <button
                key={t.key}
                role="radio"
                aria-checked={theme === t.key}
                className={`min-h-10 rounded-full text-sm font-semibold transition-colors ${
                  theme === t.key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500'
                }`}
                onClick={() => {
                  setTheme(t.key)
                  applyTheme(t.key)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Group>

        <Group title="Back up your data">
          <p className="text-slate-500">
            Everything is stored only on <strong className="text-slate-900 dark:text-white">this device</strong>, in your browser. Export a backup file regularly – it is also how you move to a new phone.
          </p>
          <p className="text-sm">
            Last backup: <strong>{lastBackup ? new Date(lastBackup).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'never'}</strong>
            <span className="block text-slate-500">
              {plural(workouts.length, 'workout', 'workouts')} · {plural(custom.length, 'custom exercise', 'custom exercises')} · {plural(bodyWeights.length, 'weight entry', 'weight entries')} · {plural(photos.length, 'photo', 'photos')}
            </span>
          </p>
          {photos.length > 0 && (
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-[var(--accent-solid)]" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
              <span>Include progress photos <span className="text-slate-500">(larger file)</span></span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary" onClick={exportData} disabled={busy}>
              {busy ? 'Working…' : 'Export'}
            </button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Import
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
          <p className="text-xs text-slate-500">
            Storage protection:{' '}
            {persisted === null
              ? 'unknown'
              : persisted
                ? 'the browser will not clear your data automatically.'
                : 'the browser may clear data when storage runs low – add the app to your home screen and back up regularly.'}
          </p>
        </Group>

        <Group title="Demo data">
          <p className="text-slate-500">
            About 12 weeks of push / pull / legs training to try out the charts. You can remove it again without touching your own workouts.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={async () => toast(`${plural(await loadDemo(), 'demo workout', 'demo workouts')} loaded.`)}>
              Load demo
            </button>
            <button className="btn-secondary" disabled={demoCount === 0} onClick={async () => toast(`${plural(await removeDemo(), 'demo workout', 'demo workouts')} removed.`)}>
              Remove demo
            </button>
          </div>
        </Group>

        <Group title="Danger zone">
          <button
            className="btn-danger w-full"
            onClick={async () => {
              if (!confirm('Permanently delete ALL workouts, custom exercises, body weights and photos?')) return
              if (!confirm('Are you really sure? This cannot be undone. Do you have a backup?')) return
              await wipeAll()
              toast('All data deleted.')
            }}
          >
            Delete all data
          </button>
        </Group>

        <p className="pb-4 text-center text-xs text-slate-500">Gym Tracker · MIT license · your data stays on your device</p>
      </div>
    </div>
  )
}
