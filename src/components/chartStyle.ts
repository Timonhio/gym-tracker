/** Shared Recharts styling – colors come from the CSS variables in index.css (light/dark aware). */
export const AXIS = { fontSize: 12, fill: 'var(--chart-text-2)' }

export const TOOLTIP = {
  contentStyle: {
    background: 'var(--chart-surface)',
    border: '1px solid var(--chart-grid)',
    borderRadius: 16,
    color: 'var(--chart-text)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  labelStyle: { color: 'var(--chart-text)', fontWeight: 600 },
  itemStyle: { color: 'var(--chart-text)' },
  cursor: { fill: 'var(--chart-grid)', opacity: 0.5 },
}
