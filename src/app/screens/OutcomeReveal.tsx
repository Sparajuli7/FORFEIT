import { PrimaryButton } from "../components/PrimaryButton";

interface OutcomeRevealProps {
  onShare: () => void;
  onBack: () => void;
}

export function OutcomeReveal({ onShare, onBack }: OutcomeRevealProps) {
  return (
    <div 
      className="h-full flex flex-col items-center justify-between px-6 py-12"
      style={{
        background: 'linear-gradient(to bottom, #1A0000 0%, #0D0D0D 100%)'
      }}
    >
      {/* Top Section */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* FORFEIT Title */}
        <h1 
          className="text-[72px] font-black text-accent-coral mb-8 text-center"
          style={{ letterSpacing: '-0.02em' }}
        >
          FORFEIT
        </h1>

        {/* Crack Effect Illustration */}
        <div className="mb-8 relative">
          <svg width="200" height="120" viewBox="0 0 200 120" className="opacity-40">
            <path 
              d="M 100 0 L 95 30 L 105 60 L 100 90 L 95 120" 
              stroke="#FF4D6D" 
              strokeWidth="2" 
              fill="none"
              strokeDasharray="5,5"
            />
            <path 
              d="M 100 60 L 60 40 L 40 60" 
              stroke="#FF4D6D" 
              strokeWidth="2" 
              fill="none"
              strokeDasharray="5,5"
            />
            <path 
              d="M 100 60 L 140 40 L 160 60" 
              stroke="#FF4D6D" 
              strokeWidth="2" 
              fill="none"
              strokeDasharray="5,5"
            />
          </svg>
        </div>

        {/* Losers */}
        <div className="mb-8">
          <p className="text-text-muted text-sm mb-4 text-center uppercase tracking-wider">Owes:</p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-bg-elevated mb-2 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
                  alt="Jordan"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-white text-sm font-medium">Jordan</span>
            </div>
          </div>
        </div>

        {/* Punishment Card */}
        <div className="bg-bg-elevated rounded-3xl border-2 border-accent-coral p-6 max-w-sm w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">😬</div>
            <p className="text-white font-bold text-lg mb-3">
              Post an embarrassing throwback to your main story
            </p>
            <div className="bg-accent-coral/20 border border-accent-coral px-3 py-1 rounded-full inline-block">
              <span className="text-accent-coral font-semibold text-sm">Medium 🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="w-full space-y-3">
        <PrimaryButton onClick={onShare} variant="danger">
          Share Result 🔥
        </PrimaryButton>
        <PrimaryButton onClick={onBack} variant="ghost">
          Back to Group
        </PrimaryButton>
      </div>
    </div>
  );
}
