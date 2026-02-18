import { Trophy } from "lucide-react";
import { SportsbookButton } from "../components/SportsbookButton";

interface CompetitionsProps {
  onNavigate?: (screen: string) => void;
}

export function Competitions({ onNavigate }: CompetitionsProps) {
  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="mb-2">
          <h1 className="text-3xl font-black text-text-primary mb-2">
            🏆 COMPETITIONS
          </h1>
          <p className="text-sm text-text-muted">Run a contest. Crown a winner.</p>
        </div>
      </div>

      {/* Competition Cards */}
      <div className="px-6 space-y-4">
        {/* Live Competition */}
        <div className="bg-bg-card border-l-status border-l-purple border border-border-subtle rounded-xl p-5">
          {/* Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                COMPETITION
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-green pulse-live"></div>
                <span className="text-[10px] font-bold text-accent-green uppercase">LIVE</span>
              </div>
            </div>
            <Trophy className="w-5 h-5 text-gold" />
          </div>

          {/* Competition name */}
          <h3 className="text-xl font-black text-text-primary mb-4">
            Most Gym Sessions — February
          </h3>

          {/* Leaderboard preview */}
          <div className="bg-bg-elevated rounded-lg p-3 mb-4 space-y-2">
            {/* Rank 1 */}
            <div className="flex items-center justify-between bg-gold/10 rounded-lg p-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tabular-nums text-gold">1</span>
                <span className="text-xl">🥇</span>
                <span className="font-bold text-sm text-text-primary">Mike</span>
              </div>
              <span className="text-xl font-black tabular-nums text-text-primary">12</span>
            </div>

            {/* Rank 2 */}
            <div className="flex items-center justify-between rounded-lg p-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tabular-nums text-text-muted">2</span>
                <span className="text-xl">🥈</span>
                <span className="font-bold text-sm text-text-primary">Sarah</span>
              </div>
              <span className="text-xl font-black tabular-nums text-text-primary">9</span>
            </div>

            {/* Rank 3 - You */}
            <div className="flex items-center justify-between bg-purple/10 rounded-lg p-2 border border-purple/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tabular-nums text-text-muted">3</span>
                <span className="text-xl">🥉</span>
                <span className="font-bold text-sm text-text-primary">You</span>
              </div>
              <span className="text-xl font-black tabular-nums text-text-primary">7</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
              8 participants
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
              Feb 1-28
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 bg-accent-coral/20 text-accent-coral rounded-full">
              Loser owes $20
            </span>
          </div>

          {/* CTA */}
          <button 
            onClick={() => onNavigate?.('leaderboard')}
            className="w-full text-center text-sm font-bold text-accent-green uppercase tracking-wide"
          >
            VIEW LEADERBOARD →
          </button>
        </div>

        {/* Ended Competition */}
        <div className="bg-bg-card border-l-status border-l-gold border border-border-subtle rounded-xl p-5 opacity-75">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              COMPETITION · ENDED
            </span>
            <Trophy className="w-5 h-5 text-gold" />
          </div>

          <h3 className="text-xl font-black text-text-primary mb-3">
            Most Steps — January
          </h3>

          <div className="bg-bg-elevated rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">👑</span>
                <span className="font-bold text-text-primary">Jordan</span>
              </div>
              <span className="text-lg font-black text-gold tabular-nums">247,329</span>
            </div>
          </div>

          <div className="text-xs text-text-muted text-center">
            Winner collected $150 · Ended 17 days ago
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="px-6 mt-6">
        <SportsbookButton onClick={() => onNavigate?.('comp-create')}>
          CREATE COMPETITION
        </SportsbookButton>
      </div>
    </div>
  );
}
