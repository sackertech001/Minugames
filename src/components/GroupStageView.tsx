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
      <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 rounded-2xl p-10 text-center text-text-muted max-w-xl mx-auto my-8">
        <p className="font-sans font-black uppercase text-xs tracking-widest text-rose-500 mb-2">Setup Required</p>
        <p className="font-sans font-medium text-xs text-text-muted leading-relaxed">
          Groups not yet generated. Please go to the <span className="font-black text-text-primary">Settings</span> tab and generate tournament groups first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-black text-text-primary uppercase tracking-widest">Group Stage</h2>
          <p className="text-xs text-text-muted font-sans font-medium mt-1">Manage stage matches, view fixtures list, and track live standings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-bg-tertiary border border-rose-500/10 rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab('fixtures')}
              className={`px-4 py-2 rounded-lg text-xs font-sans font-black uppercase tracking-wider transition-all duration-300 ${activeSubTab === 'fixtures' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-text-muted hover:text-text-primary'}`}
            >
              Fixtures
            </button>
            <button
              onClick={() => setActiveSubTab('matchTable')}
              className={`px-4 py-2 rounded-lg text-xs font-sans font-black uppercase tracking-wider transition-all duration-300 ${activeSubTab === 'matchTable' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-text-muted hover:text-text-primary'}`}
            >
              Match Table
            </button>
          </div>
          <button
            onClick={onGenerateFixtures}
            disabled={hasStartedMatches}
            className={`font-sans font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all cursor-pointer ${
              hasStartedMatches 
                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed' 
                : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
            }`}
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
