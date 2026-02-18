import { Camera, Image, Video, FileText } from "lucide-react";
import React from "react";

interface ProofSubmissionProps {
  onSubmit: () => void;
  onBack: () => void;
}

export function ProofSubmission({ onSubmit, onBack }: ProofSubmissionProps) {
  const [mode, setMode] = React.useState<'camera' | 'upload'>('camera');
  const [countdown, setCountdown] = React.useState<number | null>(null);

  return (
    <div className="h-full bg-black relative overflow-hidden">
      {mode === 'camera' ? (
        <>
          {/* Camera viewfinder simulation */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
            <div className="text-center text-white/20">
              <Camera className="w-24 h-24 mx-auto mb-4" />
              <p className="text-sm">Camera Viewfinder</p>
            </div>
          </div>

          {/* Front camera preview - BeReal style */}
          <div className="absolute top-8 right-6 w-24 h-32 bg-gray-800 rounded-2xl border-2 border-white/30 overflow-hidden shadow-2xl">
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-white/40 text-xs font-bold">FRONT</span>
            </div>
          </div>

          {/* Top banner */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent pt-safe px-6 py-6">
            <button onClick={onBack} className="text-white font-bold mb-2">
              ← Back
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1">
              SUBMIT YOUR PROOF
            </p>
            <p className="text-sm font-semibold text-white line-clamp-1">
              I'll hit the gym 5 days this week
            </p>
          </div>

          {/* Countdown timer */}
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-9xl font-black text-accent-green tabular-nums scoreboard-digit">
                {countdown}
              </div>
            </div>
          )}

          {/* Bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-12 px-6">
            <div className="text-center mb-8">
              <h2 className="text-white font-black text-2xl mb-2">Drop your proof.</h2>
              <p className="text-white/60 text-sm">
                Front and back fire at once. No staging.
              </p>
            </div>

            {/* Capture button */}
            <div className="flex flex-col items-center mb-6">
              <button 
                onClick={() => {
                  setCountdown(3);
                  const interval = setInterval(() => {
                    setCountdown(c => {
                      if (c === 1) {
                        clearInterval(interval);
                        setMode('upload');
                        return null;
                      }
                      return c ? c - 1 : null;
                    });
                  }, 1000);
                }}
                className="w-20 h-20 rounded-full border-4 border-white bg-transparent flex items-center justify-center btn-pressed mb-3"
              >
                <div className="w-16 h-16 rounded-full bg-accent-green"></div>
              </button>
              <p className="text-white/40 text-xs font-medium">3 seconds after you tap</p>
            </div>

            {/* Switch to upload mode */}
            <button
              onClick={() => setMode('upload')}
              className="w-full text-center text-sm font-bold text-white/60 uppercase tracking-wide"
            >
              Or Upload Evidence →
            </button>
          </div>
        </>
      ) : (
        /* Upload mode */
        <div className="h-full bg-bg-primary overflow-y-auto pb-8">
          {/* Header */}
          <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
            <button onClick={onBack} className="text-text-primary font-bold mb-4">
              ← Back
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
              SUBMIT YOUR PROOF
            </p>
            <h2 className="text-2xl font-black text-text-primary">
              Upload Evidence
            </h2>
          </div>

          <div className="px-6 py-6 space-y-4">
            {/* Preview boxes - side by side */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="aspect-[3/4] bg-bg-elevated rounded-xl border-2 border-dashed border-border-subtle flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted font-semibold">Front</p>
                </div>
              </div>
              <div className="aspect-[3/4] bg-bg-elevated rounded-xl border-2 border-dashed border-border-subtle flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted font-semibold">Back</p>
                </div>
              </div>
            </div>

            {/* Upload options - equal visual weight */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">
                OR UPLOAD EVIDENCE
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors">
                  <Image className="w-8 h-8 text-accent-green" />
                  <span className="text-xs font-bold text-text-primary">📸 Gallery</span>
                </button>
                
                <button className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors">
                  <FileText className="w-8 h-8 text-accent-green" />
                  <span className="text-xs font-bold text-text-primary">🖼️ Screenshot</span>
                </button>

                <button className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors">
                  <Video className="w-8 h-8 text-accent-green" />
                  <span className="text-xs font-bold text-text-primary">🎥 Video</span>
                </button>

                <button className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-accent-green transition-colors">
                  <FileText className="w-8 h-8 text-accent-green" />
                  <span className="text-xs font-bold text-text-primary">📄 Document</span>
                </button>
              </div>

              <button className="w-full mt-3 py-3 border-2 border-dashed border-border-subtle rounded-xl text-sm font-bold text-text-muted hover:border-accent-green hover:text-accent-green transition-colors">
                ➕ Add another file
              </button>
            </div>

            {/* Caption input */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2 block">
                ADD CONTEXT (OPTIONAL)
              </label>
              <textarea 
                placeholder="Add context..."
                className="w-full h-24 bg-bg-card border border-border-subtle rounded-xl p-3 text-text-primary placeholder:text-text-muted resize-none"
              />
            </div>

            {/* Proof type selector */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">
                PROOF TYPE
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  { icon: '📸', label: 'Photo' },
                  { icon: '🖼️', label: 'Screenshot' },
                  { icon: '🎥', label: 'Video' },
                  { icon: '📄', label: 'Document' }
                ].map((type, i) => (
                  <button
                    key={i}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${
                      i === 0 
                        ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                        : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="px-6 pt-4 pb-safe">
            <button
              onClick={onSubmit}
              className="w-full h-14 rounded-2xl bg-accent-coral text-white font-bold text-base btn-pressed shadow-xl"
            >
              SUBMIT PROOF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
