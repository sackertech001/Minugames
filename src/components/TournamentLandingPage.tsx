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
    <div className="min-h-screen bg-[#0F1115] text-slate-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
            <Trophy className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <h1 className="font-serif font-bold text-4xl md:text-5xl text-white uppercase tracking-wider">{config.tournamentName}</h1>
          <p className="text-slate-400 text-lg">Official Tournament Portal</p>
          {showApplyButton && (
            <button
              onClick={onApply}
              className="px-8 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] font-bold py-3 rounded-xl transition-all shadow-lg text-lg cursor-pointer"
            >
              Apply Now
            </button>
          )}
        </div>

        {!hideTabs && (
          <div className="flex justify-center gap-4 border-b border-[#2A2E37] pb-4">
              <button onClick={() => setActiveTab('info')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'info' ? 'bg-[#D4AF37] text-[#0F1115]' : 'text-slate-400 hover:text-slate-100'}`}>
                  <Info className="w-4 h-4" /> Info
              </button>
              <button onClick={() => setActiveTab('fixtures')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'fixtures' ? 'bg-[#D4AF37] text-[#0F1115]' : 'text-slate-400 hover:text-slate-100'}`}>
                  <LayoutGrid className="w-4 h-4" /> Fixtures
              </button>
              <button onClick={() => setActiveTab('live')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'live' ? 'bg-[#D4AF37] text-[#0F1115]' : 'text-slate-400 hover:text-slate-100'}`}>
                  <Radio className="w-4 h-4" /> Live
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

      </div>
    </div>
  );
}
