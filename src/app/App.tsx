import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Splash } from "./screens/Splash";
import { Onboarding } from "./screens/Onboarding";
import { TheBoard } from "./screens/TheBoard";
import { BetCreationStakes } from "./screens/BetCreationStakes";
import { ProofSubmission } from "./screens/ProofSubmission";
import { OutcomeWin } from "./screens/OutcomeWin";
import { OutcomeForfeit } from "./screens/OutcomeForfeit";
import { HallOfShame } from "./screens/HallOfShame";
import { BottomNav } from "./components/BottomNav";

type Screen = 
  | 'splash' 
  | 'onboarding'
  | 'home' 
  | 'h2h'
  | 'compete'
  | 'shame'
  | 'profile'
  | 'creation'
  | 'proof'
  | 'win'
  | 'forfeit';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [darkMode, setDarkMode] = useState(true);

  const handleNavigation = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <Splash 
            onEnter={() => setCurrentScreen('onboarding')} 
            onLogin={() => setCurrentScreen('home')}
          />
        );
      
      case 'onboarding':
        return (
          <Onboarding 
            onNext={() => setCurrentScreen('home')} 
            onSkip={() => setCurrentScreen('home')}
          />
        );
      
      case 'home':
        return (
          <>
            <TheBoard onNavigate={handleNavigation} />
            <BottomNav activeScreen="home" onNavigate={handleNavigation} />
          </>
        );
      
      case 'h2h':
        return (
          <>
            <div className="h-full bg-bg-primary grain-texture flex items-center justify-center pb-24">
              <div className="text-center px-6">
                <div className="text-6xl mb-4">⚔️</div>
                <p className="text-2xl font-black text-text-primary mb-2">HEAD TO HEAD</p>
                <p className="text-text-muted">Challenge friends directly</p>
              </div>
            </div>
            <BottomNav activeScreen="h2h" onNavigate={handleNavigation} />
          </>
        );
      
      case 'compete':
        return (
          <>
            <div className="h-full bg-bg-primary grain-texture flex items-center justify-center pb-24">
              <div className="text-center px-6">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-2xl font-black text-text-primary mb-2">COMPETITIONS</p>
                <p className="text-text-muted">Run contests. Crown winners.</p>
              </div>
            </div>
            <BottomNav activeScreen="compete" onNavigate={handleNavigation} />
          </>
        );
      
      case 'shame':
        return (
          <>
            <HallOfShame onNavigate={handleNavigation} />
            <BottomNav activeScreen="shame" onNavigate={handleNavigation} />
          </>
        );
      
      case 'profile':
        return (
          <>
            <div className="h-full bg-bg-primary grain-texture flex items-center justify-center pb-24">
              <div className="text-center px-6">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-2xl font-black text-text-primary mb-2">PROFILE</p>
                <p className="text-text-muted">Your stats and record</p>
              </div>
            </div>
            <BottomNav activeScreen="profile" onNavigate={handleNavigation} />
          </>
        );
      
      case 'creation':
        return (
          <BetCreationStakes 
            onNext={() => setCurrentScreen('proof')} 
            onBack={() => setCurrentScreen('home')}
          />
        );
      
      case 'proof':
        return (
          <ProofSubmission 
            onSubmit={() => setCurrentScreen('forfeit')} 
            onBack={() => setCurrentScreen('creation')}
          />
        );
      
      case 'win':
        return (
          <OutcomeWin 
            onShare={() => setCurrentScreen('shame')} 
            onBack={() => setCurrentScreen('home')}
          />
        );
      
      case 'forfeit':
        return (
          <OutcomeForfeit 
            onSubmitProof={() => setCurrentScreen('proof')} 
            onDispute={() => setCurrentScreen('home')}
          />
        );
      
      default:
        return (
          <Splash 
            onEnter={() => setCurrentScreen('onboarding')} 
            onLogin={() => setCurrentScreen('home')}
          />
        );
    }
  };

  return (
    <div className={`size-full flex items-center justify-center ${darkMode ? 'dark' : ''} ${darkMode ? 'bg-gray-950' : 'bg-gray-100'} p-4 transition-colors`}>
      {/* iPhone Frame */}
      <div className="relative">
        {/* Phone Bezel */}
        <div 
          className={`${darkMode ? 'bg-black' : 'bg-gray-200'} rounded-[3rem] shadow-2xl overflow-hidden border-8 ${darkMode ? 'border-gray-900' : 'border-gray-300'} transition-colors`}
          style={{
            width: '390px',
            height: '844px',
          }}
        >
          {/* Screen Content */}
          <div className="relative size-full bg-bg-primary overflow-hidden">
            {renderScreen()}
          </div>
        </div>

        {/* Dynamic Island */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${darkMode ? 'bg-black' : 'bg-gray-200'} rounded-b-3xl z-50 transition-colors`}
          style={{
            width: '120px',
            height: '30px',
          }}
        ></div>
      </div>

      {/* Controls Panel */}
      <div className={`fixed top-4 right-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl p-4 max-w-xs shadow-2xl border transition-colors`}>
        {/* Theme Toggle - Prominent */}
        <div className="mb-4 pb-4 border-b border-gray-700 dark:border-gray-800">
          <p className={`text-xs font-bold mb-3 uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Toggle Theme
          </p>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-purple-900/50' : 'bg-yellow-100'
            }`}>
              {darkMode ? (
                <Moon className="w-5 h-5 text-purple-400" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-600" />
              )}
            </div>
          </button>
        </div>

        {/* Screen Selector */}
        <p className={`text-xs font-bold mb-2 uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Jump to Screen:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'splash', label: '1. Splash' },
            { id: 'onboarding', label: '2. Onboard' },
            { id: 'home', label: '3. The Board' },
            { id: 'creation', label: '4. Stakes' },
            { id: 'proof', label: '5. Proof' },
            { id: 'win', label: '6. Winner' },
            { id: 'forfeit', label: '7. Forfeit' },
            { id: 'shame', label: '8. Shame' },
          ].map(screen => (
            <button
              key={screen.id}
              onClick={() => setCurrentScreen(screen.id as Screen)}
              className={`text-xs px-2 py-1.5 rounded-lg transition-all font-bold ${
                currentScreen === screen.id 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : darkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>

        {/* Info */}
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="font-black">FORFEIT</span> — Supreme x DraftKings
          </p>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
            Make claims. Bet on friends. Face the consequences.
          </p>
        </div>
      </div>
    </div>
  );
}
