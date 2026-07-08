import { Trophy, Calendar, MapPin, Award, Info, LayoutGrid, Radio } from 'lucide-react';
import { TournamentConfig, Player, Match } from '../types';
import { useState } from 'react';
import TournamentInfo from './TournamentInfo';
import TournamentBracket from './TournamentBracket';
import LiveDisplayScreen from './LiveDisplayScreen';

interface TournamentLandingPageProps {
  config: TournamentConfig;
  onApply: () => void;
  players: Player[];
  matches: Match[];
  showApplyButton?: boolean;
  hideTabs?: boolean;
}

export default function TournamentLandingPage({ config, onApply, players, matches, showApplyButton = true, hideTabs = false }: TournamentLandingPageProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'fixtures' | 'live'>(hideTabs ? 'info' : 'info');
  const [bracketView, setBracketView] = useState<'full' | 'day1' | 'day2' | 'day3' | 'minimized'>('full');

  return (
    <div className="min-h-screen bg-[#05101E] text-slate-100 p-4 md:p-10 relative overflow-x-hidden">
      {/* Background decorative slashes */}
      <div className="absolute top-0 left-0 w-64 h-64 overflow-hidden pointer-events-none opacity-40 hidden md:block">
        <div className="absolute top-[-50px] left-[-50px] w-96 h-10 bg-red-600/15 -rotate-45 blur-[2px]" />
        <div className="absolute top-[-20px] left-[-20px] w-96 h-3 bg-red-600/35 -rotate-45" />
        <div className="absolute top-[20px] left-[-60px] w-96 h-1 bg-red-600/20 -rotate-45" />
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden pointer-events-none opacity-40 hidden md:block">
        <div className="absolute top-[-50px] right-[-50px] w-96 h-10 bg-red-600/15 rotate-45 blur-[2px]" />
        <div className="absolute top-[-20px] right-[-20px] w-96 h-3 bg-red-600/35 rotate-45" />
        <div className="absolute top-[20px] right-[-60px] w-96 h-1 bg-red-600/20 rotate-45" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">
        <div className="text-center space-y-4 relative">
          {/* Spotlight backglow */}
          <div className="absolute top-[-140px] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-red-600/15 to-transparent rounded-full blur-[90px] pointer-events-none" />

          {/* Trophy laurel crown emblem */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-200">
              {/* Laurel branches */}
              <path d="M 38,82 C 26,78 18,68 18,52 C 18,38 26,26 38,22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
              <path d="M 62,82 C 74,78 82,68 82,52 C 82,38 74,26 62,22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
              {/* Laurel leaves left */}
              <path d="M 21,73 Q 14,68 20,63" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 18,60 Q 10,56 17,50" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 19,46 Q 12,40 20,35" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 25,33 Q 20,26 28,23" fill="none" stroke="currentColor" strokeWidth="2" />
              {/* Laurel leaves right */}
              <path d="M 79,73 Q 86,68 80,63" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 82,60 Q 90,56 83,50" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 81,46 Q 88,40 80,35" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 75,33 Q 80,26 72,23" fill="none" stroke="currentColor" strokeWidth="2" />
              {/* Trophy cup body */}
              <path d="M 36,33 L 64,33 L 64,45 C 64,56 59,64 50,64 C 41,64 36,56 36,45 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M 45,64 L 45,74 L 33,74 L 33,78 L 67,78 L 67,74 L 55,74 L 55,64" fill="none" stroke="currentColor" strokeWidth="2.5" />
              {/* Trophy handles */}
              <path d="M 36,36 C 30,36 30,46 36,46" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 64,36 C 70,36 70,46 64,46" fill="none" stroke="currentColor" strokeWidth="2" />
              {/* Inside detail */}
              <path d="M 45,41 L 55,41 M 50,38 L 50,52" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            {/* Spotlight red glow */}
            <div className="absolute inset-0 bg-red-600/10 rounded-full blur-xl animate-pulse" />
          </div>

          <div className="space-y-1">
            <h2 className="font-sans font-black text-3xl md:text-4xl text-[#E11D48] tracking-[0.25em] uppercase drop-shadow-[0_2px_8px_rgba(225,29,72,0.4)]">
              CLASS 46
            </h2>
            <h1 className="font-sans font-black text-4xl md:text-7xl text-white tracking-[0.08em] uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              CHAMPIONSHIP
            </h1>
          </div>

          {/* Subtitle with flanking lines */}
          <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-red-500/50" />
            <span className="text-slate-300 font-sans tracking-[0.35em] text-[10px] md:text-xs font-bold uppercase">
              OFFICIAL TOURNAMENT PORTAL
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>

          {showApplyButton && (
            <div className="pt-4 pb-2">
              <button
                onClick={onApply}
                className="relative group px-12 py-2.5 rounded-full overflow-hidden transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-500/60 cursor-pointer"
              >
                {/* Glowing capsule background */}
                <div className="absolute inset-0 bg-gradient-to-r from-rose-900 via-rose-600 to-rose-900 opacity-95 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-40" />

                <span className="relative z-10 font-sans font-black text-white text-xs tracking-[0.3em] uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  APPLY NOW
                </span>
              </button>
            </div>
          )}
        </div>

        {!hideTabs && (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 border-b border-[#1A1D24] pb-4 px-2">
              <button 
                onClick={() => setActiveTab('info')} 
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-300 ${activeTab === 'info' ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151C]'}`}
              >
                  <Info className="w-3.5 h-3.5 text-rose-500" /> Info
              </button>
              <button 
                onClick={() => setActiveTab('fixtures')} 
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-300 ${activeTab === 'fixtures' ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151C]'}`}
              >
                  <LayoutGrid className="w-3.5 h-3.5 text-rose-500" /> Fixtures
              </button>
              <button 
                onClick={() => setActiveTab('live')} 
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-300 ${activeTab === 'live' ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151C]'}`}
              >
                  <Radio className="w-3.5 h-3.5 text-rose-500" /> Live
              </button>
          </div>
        )}
        
        {activeTab === 'info' && <TournamentInfo config={config} />}
        {!hideTabs && activeTab === 'fixtures' && (
          <TournamentBracket 
            players={players} 
            matches={matches} 
            tournamentConfig={config} 
            onSelectMatch={() => {}}
            bracketView={bracketView}
            setBracketView={setBracketView}
          />
        )}
        {!hideTabs && activeTab === 'live' && <LiveDisplayScreen players={players} matches={matches} showOnlyScoreboard={true} />}

        {/* Footer line from poster */}
        <div className="flex items-center justify-center gap-6 pt-10 pb-4 max-w-xl mx-auto opacity-80">
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-rose-500/50 to-rose-500" />
          <span className="text-slate-300 font-sans tracking-[0.45em] text-[10px] md:text-xs font-extrabold whitespace-nowrap">
            PRECISION <span className="text-rose-500 mx-1">•</span> PASSION <span className="text-rose-500 mx-1">•</span> CHAMPIONS
          </span>
          <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-rose-500/50 to-rose-500" />
        </div>
      </div>
    </div>
  );
}
