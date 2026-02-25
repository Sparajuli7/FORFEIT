import { OddsDisplay } from "./OddsDisplay";

interface SportsbookBetCardProps {
  groupName: string;
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

export function SportsbookBetCard({
  groupName,
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
}: SportsbookBetCardProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-bg-card rounded-xl border border-border-subtle p-4 transition-all hover:shadow-lg dark:hover:shadow-xl`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 bg-bg-elevated rounded-full uppercase">
            {groupName}
          </span>
          {status === 'proof' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-live-indicator/10 border border-live-indicator rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-live-indicator pulse-live"></div>
              <span className="text-[10px] font-bold text-live-indicator uppercase">PROOF DROPPED</span>
            </div>
          )}
        </div>
        <span className={`text-sm font-black tabular-nums ${urgent ? 'text-live-indicator' : 'text-text-primary'}`}>
          {countdown}
        </span>
      </div>

      {/* Claim */}
      <h3 className="text-lg font-bold text-text-primary mb-3 line-clamp-2">
        {claimText}
      </h3>

      {/* Claimant */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-bg-elevated overflow-hidden">
          <img src={claimantAvatar} alt={claimantName} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm">
          <span className="font-semibold text-text-primary">{claimantName}</span>
          <span className="text-text-muted ml-1">claims</span>
        </span>
      </div>

      {/* Odds Display */}
      <OddsDisplay 
        ridersPercent={ridersPercent}
        doubtersPercent={doubtersPercent}
        ridersCount={ridersCount}
        doubtersCount={doubtersCount}
      />

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-semibold bg-bg-elevated px-3 py-1 rounded-full">
          {stake}
        </span>
        <span className="text-xs font-bold text-accent-green uppercase tracking-wider">
          JOIN →
        </span>
      </div>
    </button>
  );
}
