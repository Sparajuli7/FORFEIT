import { ArrowLeft, Share2 } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";

interface BetDetailProps {
  onBack: () => void;
}

export function BetDetail({ onBack }: BetDetailProps) {
  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center btn-pressed rounded-lg hover:bg-bg-elevated transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/20 border border-accent-green">
          <div className="w-2 h-2 rounded-full bg-accent-green pulse-slow"></div>
          <span className="text-xs font-semibold text-accent-green uppercase tracking-wider">Active</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Claimant */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-green to-accent-coral mb-3 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" 
            alt="Jordan"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-bold text-lg">Jordan</span>
      </div>

      {/* Claim */}
      <div className="px-6 mb-8">
        <h2 className="text-[32px] font-extrabold text-white text-center leading-tight" style={{ letterSpacing: '-0.02em' }}>
          I'll hit the gym 5 days this week
        </h2>
      </div>

      {/* Countdown Timer */}
      <div className="px-6 mb-6">
        <div className="flex justify-center gap-2 mb-3">
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white">2</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">days</div>
          </div>
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white">14</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">hrs</div>
          </div>
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white">32</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">min</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
          <div className="h-full bg-accent-green w-[65%]"></div>
        </div>
      </div>

      {/* Sides */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          {/* Riders */}
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🟢</span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Riders</span>
            </div>
            <div className="space-y-2">
              {['Alex', 'Sam', 'Taylor', 'Morgan'].map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-bg-elevated"></div>
                  <span className="text-sm text-text-muted">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doubters */}
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔴</span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Doubters</span>
            </div>
            <div className="space-y-2">
              {['Casey', 'Riley'].map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-bg-elevated"></div>
                  <span className="text-sm text-text-muted">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Join CTAs */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-accent-green rounded-2xl p-4 flex flex-col items-center gap-2 btn-pressed">
            <span className="text-2xl">🤝</span>
            <span className="text-bg-primary font-bold">Ride</span>
          </button>
          <button className="bg-accent-coral rounded-2xl p-4 flex flex-col items-center gap-2 btn-pressed">
            <span className="text-2xl">💀</span>
            <span className="text-white font-bold">Doubt</span>
          </button>
        </div>
      </div>

      {/* Stake */}
      <div className="px-6 mb-6">
        <div className="bg-bg-card rounded-2xl border border-border-subtle p-4 text-center">
          <span className="text-text-muted text-sm">Punishment: </span>
          <span className="text-white font-bold">Medium 🔥</span>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="px-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Activity</h3>
        <div className="space-y-2">
          <div className="text-sm text-text-muted">
            <span className="text-white">Casey</span> doubted • 2h ago
          </div>
          <div className="text-sm text-text-muted">
            <span className="text-white">Morgan</span> is riding • 5h ago
          </div>
          <div className="text-sm text-text-muted">
            <span className="text-white">Jordan</span> created claim • 1d ago
          </div>
        </div>
      </div>
    </div>
  );
}