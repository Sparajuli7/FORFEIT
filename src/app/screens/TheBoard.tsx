import { Bell } from "lucide-react";
import { BetCard } from "../components/BetCard";

interface TheBoardProps {
  onNavigate?: (screen: string) => void;
}

export function TheBoard({ onNavigate }: TheBoardProps) {
  const filters = [
    'All', '🏋️ Fitness', '💰 Money', '🎭 Social', '⚔️ H2H', '🏆 Compete', 'Wildcard 🎲'
  ];

  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1">
              THE BOARD
            </h1>
            <p className="text-xs text-text-muted tabular-nums">
              San Francisco · Feb 17, 2026 · 2:34 PM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative">
              <Bell className="w-5 h-5 text-text-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-live-indicator rounded-full text-[9px] font-black text-white flex items-center justify-center">
                2
              </div>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-green via-gold to-purple"></div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-live-indicator/10 border border-live-indicator/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-live-indicator pulse-live"></div>
            <span className="text-xs font-bold text-live-indicator uppercase tracking-wide">
              LIVE · 3 active
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button className="px-5 py-2 rounded-full bg-accent-green text-white font-bold text-sm">
            My Bets
          </button>
          <button className="px-5 py-2 rounded-full bg-bg-elevated text-text-muted font-semibold text-sm">
            Group Feed
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filters.map((filter, i) => (
            <button 
              key={i}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                i === 0 
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' 
                  : 'bg-bg-elevated text-text-muted'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Bet Cards */}
      <div className="px-6 space-y-3 mb-6">
        <BetCard
          groupName="THE BOYS 🔥"
          category="FITNESS"
          countdown="22:14:03"
          claimText="I'll hit the gym 5 days this week"
          claimantName="Jordan"
          claimantAvatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
          ridersPercent={67}
          doubtersPercent={33}
          ridersCount={8}
          doubtersCount={4}
          stake="🔥 Medium"
          status="active"
          urgent={true}
          onClick={() => onNavigate?.('detail')}
        />

        <BetCard
          groupName="WEEKEND CREW"
          category="MONEY"
          countdown="2D 14H"
          claimText="I won't drink alcohol for the next 30 days"
          claimantName="Alex"
          claimantAvatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
          ridersPercent={40}
          doubtersPercent={60}
          ridersCount={3}
          doubtersCount={5}
          stake="$20 honor"
          status="proof"
          onClick={() => onNavigate?.('detail')}
        />

        <BetCard
          groupName="ROOMMATES"
          category="SOCIAL"
          countdown="3D 8H"
          claimText="I'll deep clean the entire apartment this weekend"
          claimantName="Sam"
          claimantAvatar="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"
          ridersPercent={75}
          doubtersPercent={25}
          ridersCount={9}
          doubtersCount={3}
          stake="🔥 High"
          status="active"
          onClick={() => onNavigate?.('detail')}
        />
      </div>

      {/* FAB with Quick Bet label */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wide bg-bg-elevated px-3 py-1.5 rounded-full border border-border-subtle">
          Quick Bet
        </span>
        <button 
          onClick={() => onNavigate?.('creation')}
          className="w-14 h-14 rounded-full bg-accent-green text-white flex items-center justify-center text-2xl font-bold glow-green btn-pressed shadow-xl"
        >
          +
        </button>
      </div>
    </div>
  );
}
