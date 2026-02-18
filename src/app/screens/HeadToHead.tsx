import { SportsbookButton } from "../components/SportsbookButton";

interface HeadToHeadProps {
  onNavigate?: (screen: string) => void;
}

export function HeadToHead({ onNavigate }: HeadToHeadProps) {
  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="mb-2">
          <h1 className="text-3xl font-black text-text-primary mb-2">
            ⚔️ HEAD TO HEAD
          </h1>
          <p className="text-sm text-text-muted">Challenge a friend directly</p>
        </div>
      </div>

      {/* Active H2H Card - Boxing match style */}
      <div className="px-6 space-y-4">
        <div className="bg-bg-card border-l-status border-l-purple border border-border-subtle rounded-xl p-5 shadow-lg">
          {/* Status */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              COMPETITION
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green pulse-live"></div>
              <span className="text-[10px] font-bold text-accent-green uppercase">LIVE</span>
            </div>
          </div>

          {/* VS Layout */}
          <div className="flex items-center justify-between mb-5">
            {/* Player 1 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-green to-accent-coral mb-2 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
                  alt="Jordan"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-sm text-text-primary">Jordan</span>
            </div>

            {/* VS */}
            <div className="text-3xl font-black text-gold">
              VS
            </div>

            {/* Player 2 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple to-accent-coral mb-2 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                  alt="Alex"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-sm text-text-primary">Alex</span>
            </div>
          </div>

          {/* Challenge text */}
          <div className="bg-bg-elevated rounded-lg p-4 mb-4">
            <p className="text-center font-bold text-base text-text-primary">
              Who drinks more this weekend?
            </p>
          </div>

          {/* Odds bar */}
          <div className="mb-4">
            <div className="h-3 overflow-hidden flex rounded-sm mb-1">
              <div className="bg-accent-green w-[45%]"></div>
              <div className="bg-accent-coral w-[55%]"></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-accent-green tabular-nums">45%</span>
              <span className="font-bold text-accent-coral tabular-nums">55%</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
              FRI 8PM → SUN 11:59PM
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 bg-accent-coral/20 text-accent-coral rounded-full">
              $25 or Punishment
            </span>
          </div>
        </div>

        {/* Another H2H Card */}
        <div className="bg-bg-card border-l-status border-l-purple border border-border-subtle rounded-xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">
            COMPETITION · PENDING
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-accent-green mb-2 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"
                  alt="Sam"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-sm text-text-primary">Sam</span>
            </div>

            <div className="text-3xl font-black text-gold">VS</div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple to-accent-coral mb-2">
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  👤
                </div>
              </div>
              <span className="font-bold text-sm text-text-primary">You</span>
            </div>
          </div>

          <div className="bg-bg-elevated rounded-lg p-4 mb-4">
            <p className="text-center font-bold text-base text-text-primary">
              Most miles run in a week
            </p>
          </div>

          <div className="flex gap-2">
            <SportsbookButton fullWidth>
              Accept Challenge
            </SportsbookButton>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="px-6 mt-6">
        <SportsbookButton onClick={() => onNavigate?.('h2h-create')}>
          CREATE H2H CHALLENGE
        </SportsbookButton>
      </div>
    </div>
  );
}
