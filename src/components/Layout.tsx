import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../db/DataProvider'
import { getLastBackup, isBackupStale } from '../lib/backupReminder'
import { ChartIcon, DumbbellIcon, GearIcon, HistoryIcon, ListIcon } from './icons'

const TABS = [
  { to: '/', label: 'Training', Icon: DumbbellIcon, end: true },
  { to: '/history', label: 'Verlauf', Icon: HistoryIcon, end: false },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartIcon, end: false },
  { to: '/exercises', label: 'Übungen', Icon: ListIcon, end: false },
]

export default function Layout() {
  const { workouts } = useData()
  const backupDue = isBackupStale(workouts.length, getLastBackup())
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-slate-100/90 px-4 pb-2 backdrop-blur dark:bg-slate-950/90"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <span className="text-sm font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">Gym Tracker</span>
        <NavLink
          to="/settings"
          aria-label={backupDue ? 'Einstellungen – Sicherung fällig' : 'Einstellungen'}
          className={({ isActive }) =>
            `btn-ghost relative !min-h-10 !px-2 ${isActive ? '!text-emerald-600 dark:!text-emerald-400' : ''}`
          }
        >
          <GearIcon />
          {backupDue && <span className="absolute top-1.5 right-1 h-2.5 w-2.5 rounded-full bg-amber-500" title="Zeit für eine Sicherung" />}
        </NavLink>
      </header>

      <main className="px-4 pt-2 pb-40">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
