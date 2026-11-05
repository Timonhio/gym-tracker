import { useMemo, type CSSProperties } from 'react'
import Model from 'react-body-highlighter'
import { bodyMapData } from '../lib/bodymap'
import type { MuscleGroup } from '../lib/types'

/**
 * Body map, front and back, drawn with the MIT-licensed `react-body-highlighter`
 * model (its polygons come from `react-native-body-highlighter`).
 * Primary targets are strong orange, muscles that only assist a soft orange,
 * everything else stays grey. Colors follow the theme through CSS variables.
 */

const COLORS = ['var(--body-hit-soft)', 'var(--body-hit)'] // index = frequency - 1
const FIGURE: CSSProperties = { height: '100%', aspectRatio: '1 / 2' }

export function BodyMap({
  primary,
  secondary,
  className = '',
}: {
  primary: readonly MuscleGroup[]
  secondary: readonly MuscleGroup[]
  /** Give it a height (e.g. h-48); the width follows from the figure's proportions. */
  className?: string
}) {
  const key = `${primary.join()}|${secondary.join()}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => bodyMapData(primary, secondary), [key])
  const trained = primary.length ? `Trained: ${primary.join(', ')}` : 'No muscles selected yet'

  return (
    <div role="img" aria-label={`Body map (front and back). ${trained}`} className={`flex items-stretch gap-1 ${className}`}>
      <Model type="anterior" data={data} bodyColor="var(--body-muscle)" highlightedColors={COLORS} style={FIGURE} />
      <Model type="posterior" data={data} bodyColor="var(--body-muscle)" highlightedColors={COLORS} style={FIGURE} />
    </div>
  )
}
