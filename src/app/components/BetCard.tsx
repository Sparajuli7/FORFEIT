import { OddsBar } from "./OddsBar";

interface BetCardProps {
  groupName: string;
  category: string;
  countdown: string;
  claimText: string;
  claimantName: string;
  claimantAvatar: string;
  ridersPercent: number;
  doubtersPercent: number;
  ridersCount: number;
  doubtersCount: number;
  stake: string;
  status: 'active' | 'proof' | 'completed' | 'disputed';
  urgent?: boolean;
  onClick?: () => void;
}

export function BetCard({
  groupName,
  category,
  countdown,
  claimText,
  claimantName,
  claimantAvatar,
  ridersPercent,
  doubtersPercent,
  ridersCount,
  doubtersCount,
  stake,
  status,
  urgent = false,
  onClick
}: BetCardProps) {
  const borderColorClass = {
    active: 'border-status-active',
    proof: 'border-status-proof',
    completed: 'border-status-completed',
    disputed: 'border-status-disputed'
  }[status];

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-bg-card rounded-xl border-l-status ${borderColorClass} border border-border-subtle p-4 transition-all hover:shadow-lg card-shadow-light dark:card-inner-glow`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 bg-bg-elevated rounded-full uppercase tracking-wide">
            {groupName}
          </span>
          {status === 'proof' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-live-indicator/20 border border-live-indicator/40 rounded-full flash">
              <div className="w-1.5 h-1.5 rounded-full bg-live-indicator pulse-live"></div>
              <span className="text-[10px] font-bold text-live-indicator uppercase tracking-wide">
                👀 PROOF DROPPED
              </span>
            </div>
          )}
        </div>
        <span className={`text-sm font-black tabular-nums scoreboard-digit ${urgent ? 'text-live-indicator' : 'text-text-primary'}`}>
          {countdown}
        </span>
      </div>

      {/* Category */}
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
        {category}
      </div>

      {/* Claim */}
      <h3 className="text-lg font-bold text-text-primary mb-3 line-clamp-2 leading-snug">
        {claimText}
      </h3>

      {/* Claimant */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-bg-elevated overflow-hidden relative">
          <img src={claimantAvatar} alt={claimantName} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm">
          <span className="font-semibold text-text-primary">{claimantName}</span>
          <span className="text-text-muted ml-1">claims</span>
        </span>
      </div>

      {/* Odds Bar - THE signature UI element */}
      <OddsBar 
        ridersPercent={ridersPercent}
        doubtersPercent={doubtersPercent}
        ridersCount={ridersCount}
        doubtersCount={doubtersCount}
      />

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs font-bold bg-bg-elevated px-3 py-1.5 rounded-full">
          {stake}
        </span>
        <span className="text-xs font-bold text-accent-green uppercase tracking-wider">
          JOIN →
        </span>
      </div>
    </button>
  );
}
