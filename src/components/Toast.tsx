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

// One calm look; a small colored dot tells the kinds apart.
const DOT: Record<Kind, string> = {
  info: 'bg-slate-400',
  pr: 'bg-[var(--accent-solid)]',
  error: 'bg-red-500',
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
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-800"
          >
            <span className={`size-2.5 shrink-0 rounded-full ${DOT[t.kind]}`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
