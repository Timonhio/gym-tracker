import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import { DataProvider } from './db/DataProvider'
import ExercisesPage from './pages/Exercises'
import HistoryPage from './pages/History'
import SettingsPage from './pages/Settings'
import TrainingRoute from './pages/Training'

// The dashboard pulls in the chart library (large) – load it only when opened.
// It is still precached by the service worker, so it works offline.
const DashboardPage = lazy(() => import('./pages/Dashboard'))

// HashRouter (URLs like /#/history) works on GitHub Pages without server-side
// rewrites – a reload on a deep link would otherwise give a 404.
export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <DataProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<TrainingRoute />} />
              <Route path="edit/:id" element={<TrainingRoute />} />
              <Route path="history" element={<HistoryPage />} />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<p className="py-10 text-center text-slate-500">Loading …</p>}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route path="exercises" element={<ExercisesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<TrainingRoute />} />
            </Route>
          </Routes>
        </DataProvider>
      </ToastProvider>
    </HashRouter>
  )
}
