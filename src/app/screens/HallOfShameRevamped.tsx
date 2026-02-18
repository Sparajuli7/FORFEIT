interface HallOfShameRevampedProps {
  onNavigate?: (screen: string) => void;
}

export function HallOfShameRevamped({ onNavigate }: HallOfShameRevampedProps) {
  const shameCards = [
    {
      name: "Jordan",
      betTitle: "Hit the gym 5 days",
      punishment: "Post an embarrassing throwback to main story",
      confirmed: true,
      verifiedBy: 7,
      completionRate: 71,
      frontImg: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=400&fit=crop",
      backImg: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=400&fit=crop",
      reactions: { '😭': 24, '💀': 15, '🔥': 38 }
    },
    {
      name: "Alex",
      betTitle: "No drinking for 30 days",
      punishment: "Admit secret crush on story",
      confirmed: false,
      verifiedBy: 0,
      completionRate: 43,
      frontImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop",
      backImg: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=400&fit=crop",
      reactions: { '😭': 45, '💀': 28, '🔥': 52 }
    }
  ];

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-3xl font-black text-text-primary mb-2">
          💀 HALL OF SHAME
        </h1>

        {/* Stats Ticker */}
        <div className="overflow-hidden bg-bg-elevated rounded-full py-2 px-4 border border-border-subtle mb-4">
          <div className="whitespace-nowrap">
            <span className="inline-block animate-marquee text-text-muted text-xs font-medium">
              💀 47 punishments executed this week · 🔥 219 total claims · 😭 Most forfeited: Sam (12 times) · 
              💀 47 punishments executed this week · 🔥 219 total claims · 😭 Most forfeited: Sam (12 times)
            </span>
          </div>
        </div>
      </div>

      {/* Punishment Leaderboard */}
      <div className="px-6 mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
          PUNISHMENT LEADERBOARD
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[
            { name: "Sam", count: 12, rate: 43, avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop" },
            { name: "Jordan", count: 8, rate: 71, avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
            { name: "Alex", count: 7, rate: 29, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" }
          ].map((person, i) => (
            <div 
              key={i} 
              className="bg-bg-card border border-border-subtle rounded-xl p-4 min-w-[140px] flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-bg-elevated mb-2 overflow-hidden">
                <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-sm text-text-primary mb-1">{person.name}</span>
              <span className="text-2xl font-black tabular-nums text-accent-coral mb-1">{person.count}</span>
              <span className="text-xs text-text-muted">punishments</span>
              <div className="mt-2 px-2 py-1 bg-bg-elevated rounded-full">
                <span className={`text-xs font-bold tabular-nums ${person.rate >= 70 ? 'text-accent-green' : 'text-accent-coral'}`}>
                  {person.rate}% rate
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shame Cards */}
      <div className="px-6 space-y-4">
        {shameCards.map((card, index) => (
          <div key={index} className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
            {/* Status Badge */}
            <div className="p-3 flex items-center justify-between">
              {card.confirmed ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-accent-green/20 rounded-full">
                  <span className="text-xs font-bold text-accent-green uppercase tracking-wide">
                    ✓ CONFIRMED
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-accent-coral/20 rounded-full">
                  <span className="text-xs font-bold text-accent-coral uppercase tracking-wide">
                    ✗ DISPUTED
                  </span>
                </div>
              )}
              <span className="text-xs font-bold text-text-primary tabular-nums">
                {card.completionRate}% rate
              </span>
            </div>

            {/* Photos */}
            <div className="flex">
              <div className="flex-1 aspect-[3/4] bg-bg-elevated overflow-hidden">
                <img 
                  src={card.frontImg} 
                  alt="Front"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 aspect-[3/4] bg-bg-elevated overflow-hidden">
                <img 
                  src={card.backImg} 
                  alt="Back"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="mb-2">
                <p className="text-sm">
                  <span className="font-bold text-text-primary">{card.name}</span>
                  <span className="text-text-muted"> lost · </span>
                  <span className="text-text-muted">{card.betTitle}</span>
                </p>
              </div>
              
              <p className="text-accent-coral font-bold text-sm mb-3">
                {card.punishment}
              </p>

              {card.confirmed && (
                <p className="text-xs text-accent-green font-semibold mb-3">
                  VERIFIED BY {card.verifiedBy} PEOPLE
                </p>
              )}

              {/* Reactions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  {Object.entries(card.reactions).map(([emoji, count]) => (
                    <button 
                      key={emoji}
                      className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <span>{emoji}</span>
                      <span className="text-sm font-bold tabular-nums">{count}</span>
                    </button>
                  ))}
                </div>
                <button className="text-text-muted hover:text-text-primary">
                  <span className="text-lg">↗️</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Group Stats Summary */}
      <div className="px-6 mt-6 mb-6">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">
            YOUR GROUP STATS
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-text-muted text-xs mb-1">Punishments issued</p>
              <p className="text-3xl font-black tabular-nums text-text-primary">34</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-1">Confirmed</p>
              <p className="text-3xl font-black tabular-nums text-accent-green">24</p>
            </div>
          </div>

          {/* Segmented bar */}
          <div className="space-y-2">
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="bg-accent-green" style={{ width: '71%' }}></div>
              <div className="bg-accent-coral" style={{ width: '21%' }}></div>
              <div className="bg-text-muted" style={{ width: '8%' }}></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-accent-green font-bold">71% Confirmed</span>
              <span className="text-accent-coral font-bold">21% Disputed</span>
              <span className="text-text-muted font-bold">8% Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
