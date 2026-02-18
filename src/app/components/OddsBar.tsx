interface OddsBarProps {
  ridersPercent: number;
  doubtersPercent: number;
  ridersCount: number;
  doubtersCount: number;
  size?: 'default' | 'large';
}

export function OddsBar({ 
  ridersPercent, 
  doubtersPercent, 
  ridersCount, 
  doubtersCount,
  size = 'default'
}: OddsBarProps) {
  const isLarge = size === 'large';
  
  return (
    <div className="space-y-2">
      {/* THE ODDS SECTION - Signature UI element */}
      <div className="grid grid-cols-2 gap-2">
        {/* Riders panel */}
        <div className="bg-accent-green/[0.08] dark:bg-accent-green/[0.06] rounded-lg p-3 border border-accent-green/20">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
            RIDERS
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`${isLarge ? 'text-4xl' : 'text-3xl'} font-black text-accent-green tabular-nums scoreboard-digit`}>
              {ridersPercent}%
            </span>
            <span className="text-sm text-text-muted font-bold tabular-nums">
              {ridersCount}
            </span>
          </div>
        </div>

        {/* Doubters panel */}
        <div className="bg-accent-coral/[0.08] dark:bg-accent-coral/[0.06] rounded-lg p-3 border border-accent-coral/20">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
            DOUBTERS
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`${isLarge ? 'text-4xl' : 'text-3xl'} font-black text-accent-coral tabular-nums scoreboard-digit`}>
              {doubtersPercent}%
            </span>
            <span className="text-sm text-text-muted font-bold tabular-nums">
              {doubtersCount}
            </span>
          </div>
        </div>
      </div>

      {/* Proportional odds bar - 8px height, sharp corners */}
      <div className="h-2 overflow-hidden flex">
        <div 
          className="bg-accent-green" 
          style={{ width: `${ridersPercent}%` }}
        ></div>
        <div 
          className="bg-accent-coral" 
          style={{ width: `${doubtersPercent}%` }}
        ></div>
      </div>

      {/* Count text */}
      <div className="text-xs text-text-muted font-medium">
        {ridersCount} Riders · {doubtersCount} Doubters
      </div>
    </div>
  );
}
