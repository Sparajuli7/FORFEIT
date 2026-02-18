interface OddsDisplayProps {
  ridersPercent: number;
  doubtersPercent: number;
  ridersCount: number;
  doubtersCount: number;
  size?: 'default' | 'large';
}

export function OddsDisplay({ 
  ridersPercent, 
  doubtersPercent, 
  ridersCount, 
  doubtersCount,
  size = 'default'
}: OddsDisplayProps) {
  const isLarge = size === 'large';
  
  return (
    <div className="space-y-2">
      {/* Odds panels */}
      <div className="grid grid-cols-2 gap-2">
        {/* Riders panel */}
        <div className="bg-accent-green/10 dark:bg-accent-green/5 rounded-lg p-3 border border-accent-green/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            RIDERS
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-black text-accent-green tabular-nums`}>
              {ridersPercent}%
            </span>
            <span className="text-sm text-text-muted font-semibold">
              ({ridersCount})
            </span>
          </div>
        </div>

        {/* Doubters panel */}
        <div className="bg-accent-coral/10 dark:bg-accent-coral/5 rounded-lg p-3 border border-accent-coral/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            DOUBTERS
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-black text-accent-coral tabular-nums`}>
              {doubtersPercent}%
            </span>
            <span className="text-sm text-text-muted font-semibold">
              ({doubtersCount})
            </span>
          </div>
        </div>
      </div>

      {/* Visual odds bar */}
      <div className="h-2 overflow-hidden flex rounded-sm">
        <div 
          className="bg-accent-green" 
          style={{ width: `${ridersPercent}%` }}
        ></div>
        <div 
          className="bg-accent-coral" 
          style={{ width: `${doubtersPercent}%` }}
        ></div>
      </div>
    </div>
  );
}
