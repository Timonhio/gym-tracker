import { NavLink, Outlet } from 'react-router-dom'
import { ChartIcon, DumbbellIcon, HistoryIcon, ListIcon } from './icons'

const TABS = [
  { to: '/', label: 'Train', Icon: DumbbellIcon, end: true },
  { to: '/history', label: 'History', Icon: HistoryIcon, end: false },
  { to: '/dashboard', label: 'Progress', Icon: ChartIcon, end: false },
  { to: '/exercises', label: 'Exercises', Icon: ListIcon, end: false },
]

export default function Layout() {
  return (
    <div className="mx-auto min-h-dvh max-w-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <main className="px-4 pt-5 pb-44">
        <Outlet />
      </main>

      {/* floating pill navigation */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <ul className="pointer-events-auto mx-auto flex max-w-sm gap-1 rounded-full border border-black/5 bg-white/90 p-1.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white [&_svg]:text-accent'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
