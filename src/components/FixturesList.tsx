import React from 'react';
import { Match, Player } from '../types';
import { Play, Eye, Calendar, Clock, Trophy } from 'lucide-react';

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
    <div className="bg-bg-secondary border border-rose-500/10 dark:border-rose-500/15 p-6 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.03)] space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-rose-500/10">
        <h3 className="text-xs font-sans font-black text-text-primary uppercase tracking-[0.15em] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-rose-500" /> Tournament Fixtures
        </h3>
        <span className="text-[10px] font-sans font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest">Group Stage Matchups</span>
      </div>

      <div className="space-y-2.5">
        {groupStageMatches.length === 0 && (
          <p className="text-text-muted font-sans font-medium text-xs py-4 text-center">No fixtures generated.</p>
        )}
        {groupStageMatches.length > 0 && (
          <div className="grid grid-cols-6 gap-3 text-[10px] text-text-muted font-sans font-black uppercase tracking-widest px-3.5 mb-1">
            <span>Match</span>
            <span>Fixture</span>
            <span>Date</span>
            <span>Time</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
        )}
        {groupStageMatches.map((match) => {
          const player1 = players.find(p => p.id === match.player1Id);
          const player2 = players.find(p => p.id === match.player2Id);
          return (
            <div key={match.id} className="grid grid-cols-6 gap-3 items-center bg-bg-tertiary border border-rose-500/10 p-3.5 rounded-xl text-xs hover:border-rose-500/25 hover:bg-rose-500/5 transition-all">
              <span className="text-rose-500 dark:text-rose-400 font-sans font-black uppercase tracking-wider">{match.label}</span>
              <span className="text-text-primary font-sans font-bold truncate">
                {player1?.name || 'TBD'} <span className="text-text-muted font-medium">vs</span> {player2?.name || 'TBD'}
              </span>
              <div className="relative">
                <input 
                  type="date" 
                  value={match.matchDate || ''} 
                  onChange={(e) => {
                    console.log('DEBUG: Date changed to', e.target.value);
                    onUpdateMatch(match.id, { matchDate: e.target.value });
                  }} 
                  className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 text-text-primary font-sans font-bold text-xs rounded-lg p-1.5 outline-none transition-all w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert" 
                />
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={match.scheduledTime || ''} 
                  onChange={(e) => onUpdateMatch(match.id, { scheduledTime: e.target.value })} 
                  className="bg-bg-primary border border-rose-500/15 focus:border-rose-500 text-text-primary font-sans font-bold text-xs rounded-lg p-1.5 outline-none transition-all w-full" 
                  placeholder="10:00 AM" 
                />
              </div>
              <div className="flex">
                {match.status === 'scheduled' && (
                  <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-sans font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                    Scheduled
                  </span>
                )}
                {match.status === 'playing' && (
                  <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-sans font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md animate-pulse">
                    Live
                  </span>
                )}
                {match.status === 'completed' && (
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-sans font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                    Ended
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 justify-end">
                {match.status === 'scheduled' && (
                  <button
                    onClick={() => onStartMatch(match.id)}
                    className="bg-rose-500 hover:bg-rose-600 text-white border border-rose-500/30 font-sans font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.15)] flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Start
                  </button>
                )}
                <button
                  onClick={() => onViewMatch(match.id)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/30 font-sans font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3 h-3 text-slate-400" /> View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
