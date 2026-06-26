import React from 'react';
import { Match, Player } from '../types';

interface FixturesListProps {
  matches: Match[];
  players: Player[];
  onStartMatch: (matchId: string) => void;
  onViewMatch: (matchId: string) => void;
  onUpdateMatch: (matchId: string, updates: Partial<Match>) => void;
}

export default function FixturesList({ matches, players, onStartMatch, onViewMatch, onUpdateMatch }: FixturesListProps) {
  const groupStageMatches = matches.filter(m => m.round === 'GroupStage');

  return (
    <div className="glass-panel p-4 rounded-xl">
      <h3 className="text-lg font-bold text-white mb-4">Fixtures</h3>
      <div className="space-y-2">
        {groupStageMatches.length === 0 && <p className="text-slate-400 text-sm">No fixtures generated.</p>}
        {groupStageMatches.length > 0 && (
          <div className="grid grid-cols-6 gap-2 text-[10px] text-slate-500 uppercase px-2 mb-2">
            <span>Match</span>
            <span>Fixture</span>
            <span>Date</span>
            <span>Time</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
        )}
        {groupStageMatches.map((match) => {
          const player1 = players.find(p => p.id === match.player1Id);
          const player2 = players.find(p => p.id === match.player2Id);
          return (
            <div key={match.id} className="grid grid-cols-6 gap-2 items-center bg-[#12151A]/60 p-2 rounded-lg text-xs">
              <span className="text-slate-300 font-medium truncate">{match.label}</span>
              <span className="text-white font-medium truncate">{player1?.name || 'TBD'} vs {player2?.name || 'TBD'}</span>
              <input type="date" value={match.matchDate || ''} onChange={(e) => {
                console.log('DEBUG: Date changed to', e.target.value);
                onUpdateMatch(match.id, { matchDate: e.target.value });
              }} className="bg-[#1A1D23] text-slate-300 text-xs rounded p-1" />
              <input type="text" value={match.scheduledTime || ''} onChange={(e) => onUpdateMatch(match.id, { scheduledTime: e.target.value })} className="bg-[#1A1D23] text-slate-300 text-xs rounded p-1 w-full" placeholder="10:00" />
              <div className="flex gap-2">
                {match.status === 'scheduled' && (
                  <span className="text-slate-500 font-bold text-[10px]">Scheduled</span>
                )}
                {match.status === 'playing' && (
                  <span className="bg-red-500/20 text-red-500 font-bold text-[10px] px-2 py-1 rounded">
                    Live
                  </span>
                )}
                {match.status === 'completed' && (
                  <span className="bg-emerald-500/20 text-emerald-500 font-bold text-[10px] px-2 py-1 rounded">
                    Ended
                  </span>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                {match.status === 'scheduled' && (
                  <button
                    onClick={() => onStartMatch(match.id)}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0F1115] font-bold text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => onViewMatch(match.id)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
