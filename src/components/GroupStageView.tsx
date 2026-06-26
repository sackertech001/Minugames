import React, { useState } from 'react';
import { TournamentConfig, Player, Match } from '../types';
import StandingsTable from './StandingsTable';
import FixturesList from './FixturesList';

interface GroupStageViewProps {
  tournamentConfig: TournamentConfig;
  players: Player[];
  matches: Match[];
  onGenerateFixtures: () => void;
  onStartMatch: (matchId: string) => void;
  onViewMatch: (matchId: string) => void;
  onUpdateMatch: (matchId: string, updates: Partial<Match>) => void;
}

export default function GroupStageView({ tournamentConfig, players, matches, onGenerateFixtures, onStartMatch, onViewMatch, onUpdateMatch }: GroupStageViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'matchTable'>('fixtures');
  const hasStartedMatches = matches.some(m => m.round === 'GroupStage' && m.status !== 'scheduled');

  if (!tournamentConfig.groups || tournamentConfig.groups.length === 0) {
    return (
      <div className="text-center p-10 text-slate-400">
        Groups not yet generated. Please generate groups in settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Group Stage</h2>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#12151A] rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab('fixtures')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'fixtures' ? 'bg-[#D4AF37] text-[#0F1115]' : 'text-slate-400 hover:text-white'}`}
            >
              Fixtures
            </button>
            <button
              onClick={() => setActiveSubTab('matchTable')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'matchTable' ? 'bg-[#D4AF37] text-[#0F1115]' : 'text-slate-400 hover:text-white'}`}
            >
              Match Table
            </button>
          </div>
          <button
            onClick={onGenerateFixtures}
            className={`font-bold text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115]`}
          >
            {hasStartedMatches ? 'Fixtures Locked' : 'Generate Fixtures'}
          </button>
        </div>
      </div>

      {activeSubTab === 'fixtures' && (
        <FixturesList matches={matches} players={players} onStartMatch={onStartMatch} onViewMatch={onViewMatch} onUpdateMatch={onUpdateMatch} />
      )}

      {activeSubTab === 'matchTable' && (
        <div className="space-y-6">
          {tournamentConfig.groups.map((group) => (
            <StandingsTable key={group.id} group={group} players={players} />
          ))}
        </div>
      )}
    </div>
  );
}
