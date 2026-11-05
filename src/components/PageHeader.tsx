import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useData } from '../db/DataProvider'
import { getLastBackup, isBackupStale } from '../lib/backupReminder'
import { SlidersIcon } from './icons'

/** Round settings button; shows a dot when a backup is due. */
export function SettingsButton() {
  const { workouts } = useData()
  const backupDue = isBackupStale(workouts.length, getLastBackup())
  return (
    <NavLink to="/settings" className="btn-icon relative" aria-label={backupDue ? 'Settings – backup due' : 'Settings'}>
      <SlidersIcon className="h-5 w-5" />
      {backupDue && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-[var(--accent-solid)] ring-2 ring-slate-200 dark:ring-slate-800" title="Time for a backup" />}
    </NavLink>
  )
}

/** Large page title with round action buttons on the right, as in the reference design. */
export function PageHeader({
  title,
  eyebrow,
  actions,
  hideSettings,
}: {
  title: ReactNode
  eyebrow?: string
  actions?: ReactNode
  hideSettings?: boolean
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-3xl leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex shrink-0 gap-2 pt-0.5">
        {actions}
        {!hideSettings && <SettingsButton />}
      </div>
    </header>
  )
}
