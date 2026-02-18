interface ProfileScreenProps {
  activeScreen: string;
}

export function ProfileScreen({ activeScreen }: ProfileScreenProps) {
  const rivalries = [
    { name: "Sam", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop", wins: 7, losses: 3 },
    { name: "Alex", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", wins: 4, losses: 6 },
    { name: "Jordan", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", wins: 5, losses: 5 }
  ];

  const recentBets = [
    { title: "Hit the gym 5 days", status: "won", time: "2d ago" },
    { title: "No junk food for a week", status: "lost", time: "5d ago" },
    { title: "Wake up before 7am daily", status: "won", time: "1w ago" }
  ];

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-green to-accent-coral mx-auto mb-4 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Taylor Reed</h2>
        <p className="text-text-muted">@taylorr</p>
      </div>

      {/* Stats Grid */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Total Bets</p>
            <p className="text-3xl font-black text-white">24</p>
          </div>
          
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Win Rate</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#2A2A2A"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#00FF87"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.58)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent-green">58%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Best Streak</p>
            <p className="text-3xl font-black text-white">3</p>
          </div>

          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Punishments</p>
            <p className="text-3xl font-black text-white">7 💀</p>
          </div>
        </div>
      </div>

      {/* Beef Board */}
      <div className="px-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Your Beef Board</h3>
        <div className="space-y-3">
          {rivalries.map((rival, index) => (
            <div 
              key={index}
              className="bg-bg-card rounded-xl border border-border-subtle p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden">
                  <img src={rival.avatar} alt={rival.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-medium">{rival.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent-green font-bold">{rival.wins}W</span>
                <span className="text-text-muted">-</span>
                <span className="text-accent-coral font-bold">{rival.losses}L</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bets */}
      <div className="px-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Bets</h3>
        <div className="space-y-2">
          {recentBets.map((bet, index) => (
            <div 
              key={index}
              className="bg-bg-card rounded-xl border border-border-subtle p-3 flex items-center justify-between"
            >
              <div>
                <p className="text-white text-sm font-medium mb-1">{bet.title}</p>
                <p className="text-text-muted text-xs">{bet.time}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                bet.status === 'won' 
                  ? 'bg-accent-green/20 text-accent-green' 
                  : 'bg-accent-coral/20 text-accent-coral'
              }`}>
                {bet.status === 'won' ? '✓ Won' : '✗ Lost'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}