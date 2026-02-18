import { PrimaryButton } from "../components/PrimaryButton";

interface SplashScreenProps {
  onGetStarted: () => void;
}

export function SplashScreen({ onGetStarted }: SplashScreenProps) {
  return (
    <div className="h-full bg-bg-primary noise-texture flex flex-col items-center justify-center px-6 relative">
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 
          className="glitch text-[72px] font-black text-white tracking-tight mb-4"
          data-text="FORFEIT"
          style={{ letterSpacing: '-0.02em' }}
        >
          FORFEIT
        </h1>
        <p className="text-text-muted text-center text-base">
          Make claims. Bet on friends. Face the consequences.
        </p>
      </div>

      <div className="w-full pb-8">
        <PrimaryButton onClick={onGetStarted}>
          Get Started
        </PrimaryButton>
      </div>
    </div>
  );
}
