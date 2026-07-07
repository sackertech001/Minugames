import React from 'react';
import { Match, Player } from '../types';
import { Play, Eye, Calendar, Clock, Trophy, Star } from 'lucide-react';

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
    <div className="bg-[#121F32] border border-[#1A2740] p-6 rounded-3xl shadow-xl space-y-5 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#1A2740]">
        <h3 className="text-xs font-display font-black text-white uppercase tracking-[0.15em] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#F1C317]" /> Tournament Fixtures
        </h3>
        <span className="text-[10px] font-sans font-black text-[#1A6DFF] uppercase tracking-widest">Group Stage Matchups</span>
      </div>

      <div className="space-y-3">
        {groupStageMatches.length === 0 && (
          <p className="text-[#787E90] font-sans font-medium text-xs py-6 text-center">No fixtures generated.</p>
        )}
        {groupStageMatches.length > 0 && (
          <div className="hidden lg:grid grid-cols-6 gap-3 text-[10px] text-[#787E90] font-sans font-black uppercase tracking-widest px-4 mb-2">
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
            <div 
              key={match.id} 
              className="grid grid-cols-1 lg:grid-cols-6 gap-3 lg:gap-4 items-center bg-[#04142B] border border-[#1A2740] p-4 rounded-2xl text-xs hover:border-[#1A6DFF]/30 transition-all duration-300"
            >
              {/* Match ID label */}
              <div className="flex justify-between items-center lg:block">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest">Match ID</span>
                <span className="text-[#1A6DFF] font-sans font-black uppercase tracking-wider">{match.label}</span>
              </div>
              
              {/* Contenders name */}
              <div className="flex justify-between items-center lg:block min-w-0">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest">Fixture</span>
                <span className="text-[#EEF1F5] font-sans font-bold truncate">
                  {player1?.name || 'TBD'} <span className="text-[#787E90] font-medium font-sans">vs</span> {player2?.name || 'TBD'}
                </span>
              </div>
              
              {/* Date Input */}
              <div className="flex flex-col gap-1 lg:block">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest text-left">Date</span>
                <input 
                  type="date" 
                  value={match.matchDate || ''} 
                  onChange={(e) => {
                    onUpdateMatch(match.id, { matchDate: e.target.value });
                  }} 
                  className="bg-[#121F32] border border-[#1A2740] focus:border-[#1A6DFF] text-white font-sans font-bold text-xs rounded-xl px-3 py-2 outline-none transition-all w-full cursor-pointer" 
                />
              </div>
              
              {/* Time Input */}
              <div className="flex flex-col gap-1 lg:block">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest text-left">Time</span>
                <input 
                  type="text" 
                  value={match.scheduledTime || ''} 
                  onChange={(e) => onUpdateMatch(match.id, { scheduledTime: e.target.value })} 
                  className="bg-[#121F32] border border-[#1A2740] focus:border-[#1A6DFF] text-white font-sans font-bold text-xs rounded-xl px-3 py-2 outline-none transition-all w-full" 
                  placeholder="10:00 AM" 
                />
              </div>
              
              {/* Match Status Badge */}
              <div className="flex justify-between items-center lg:block">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest">Status</span>
                <div className="flex">
                  {match.status === 'scheduled' && (
                    <span className="bg-[#121F32] text-[#B2B6C2] border border-[#1A2740] font-sans font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md">
                      Scheduled
                    </span>
                  )}
                  {match.status === 'playing' && (
                    <span className="bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 font-sans font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md animate-pulse flex items-center gap-1">
                      <span className="w-1 h-1 bg-[#EF4444] rounded-full animate-ping"></span> Live
                    </span>
                  )}
                  {match.status === 'completed' && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md">
                      Completed
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between items-center lg:block">
                <span className="lg:hidden text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest">Actions</span>
                <div className="flex gap-2 justify-end">
                  {match.status === 'scheduled' && (
                    <button
                      onClick={() => onStartMatch(match.id)}
                      className="bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] hover:from-[#4088FF] hover:to-[#1A6DFF] text-white font-sans font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                  <button
                    onClick={() => onViewMatch(match.id)}
                    className="bg-[#121F32] hover:bg-[#1A2740] text-[#B2B6C2] hover:text-white border border-[#1A2740] font-sans font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#787E90]" /> View
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
