import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// CircleGrid — reusable 3-column grid of circular items with labels
// Inspired by the "Follow Teams" pattern: circle icon + label underneath.
// ---------------------------------------------------------------------------

export interface CircleGridItem {
  id: string
  /** Large emoji, icon, or image shown inside the circle */
  icon: ReactNode
  /** Primary label shown below the circle */
  label: string
  /** Optional secondary label (smaller, muted) */
  sublabel?: string
}

interface CircleGridProps {
  items: CircleGridItem[]
  onItemClick: (id: string) => void
  /** Number of columns (default 3) */
  columns?: 3 | 4
  /** Size of each circle: 'md' = 72px, 'lg' = 80px (default 'md') */
  size?: 'md' | 'lg'
}

export function CircleGrid({
  items,
  onItemClick,
  columns = 3,
  size = 'md',
}: CircleGridProps) {
  const gridCols = columns === 4 ? 'grid-cols-4' : 'grid-cols-3'
  const circleSize = size === 'lg' ? 'w-20 h-20' : 'w-[72px] h-[72px]'
  const iconSize = size === 'lg' ? 'text-3xl' : 'text-2xl'

  return (
    <div className={`grid ${gridCols} gap-y-5 gap-x-3`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div
            className={`${circleSize} rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center transition-all group-hover:bg-bg-card group-hover:border-accent-green/40 group-active:scale-95`}
          >
            <span className={iconSize}>{item.icon}</span>
          </div>
          <span className="text-xs font-semibold text-text-primary text-center leading-tight line-clamp-1 max-w-full px-1">
            {item.label}
          </span>
          {item.sublabel && (
            <span className="text-[10px] text-text-muted -mt-1">{item.sublabel}</span>
          )}
        </button>
      ))}
    </div>
  )
}
