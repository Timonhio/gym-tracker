import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'info' | 'pr' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: Kind
}
type ShowToast = (message: string, kind?: Kind) => void

const ToastContext = createContext<ShowToast>(() => {})
export const useToast = () => useContext(ToastContext)

const STYLE: Record<Kind, string> = {
  info: 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900',
  pr: 'bg-amber-400 text-slate-900',
  error: 'bg-red-600 text-white',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback<ShowToast>((message, kind = 'info') => {
    const id = nextId.current++
    setItems((prev) => [...prev.slice(-2), { id, message, kind }])
    if (kind === 'pr') navigator.vibrate?.([60, 40, 60])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === 'pr' ? 4500 : 3000)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${STYLE[t.kind]}`}
          >
            {t.kind === 'pr' && <span className="mr-1">🏆</span>}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
