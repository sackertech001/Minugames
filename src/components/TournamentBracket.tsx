import React, { useState } from 'react';
import { Player, Match, TournamentConfig } from '../types';
import { Zap, Calendar, Play, Trophy, Users, Award, Star } from 'lucide-react';

interface TournamentBracketProps {
  matches: Match[];
  players: Player[];
  tournamentConfig: TournamentConfig;
  onSelectMatch: (matchId: string) => void;
  onStartMatch?: (matchId: string) => void;
  bracketView: 'full' | 'day1' | 'day2' | 'day3' | 'minimized';
  setBracketView: (view: 'full' | 'day1' | 'day2' | 'day3' | 'minimized') => void;
}

export default function TournamentBracket({
  matches,
  players,
  tournamentConfig,
  onSelectMatch,
  onStartMatch,
  bracketView,
  setBracketView,
}: TournamentBracketProps) {
  // Helper to render rounds based on playersCount
  const showRound = (round: string) => {
    if (tournamentConfig.playersCount === 8) {
      return ['QF', 'SF', 'F', '3RD'].includes(round);
    }
    if (tournamentConfig.playersCount === 16) {
      return ['R16', 'QF', 'SF', 'F', '3RD'].includes(round);
    }
    return true; // 32 players
  };

  // Helper to get round info based on playersCount
  const getRoundInfo = (round: string) => {
    if (tournamentConfig.playersCount === 8) {
      if (round === 'QF') return { title: 'QUARTER FINALS', subtitle: 'Day 1 • 4 Matches' };
      if (round === 'SF') return { title: 'SEMI FINALS', subtitle: 'Day 2 • 2 Matches' };
      if (round === 'F') return { title: 'CHAMPIONSHIP FINALS', subtitle: 'Day 3 • 2 Matches' };
    }
    if (tournamentConfig.playersCount === 16) {
      if (round === 'R16') return { title: 'ROUND OF 16', subtitle: 'Day 1 • 8 Matches' };
      if (round === 'QF') return { title: 'QUARTER FINALS', subtitle: 'Day 2 • 4 Matches' };
      if (round === 'SF') return { title: 'SEMI FINALS', subtitle: 'Day 3 • 2 Matches' };
      if (round === 'F') return { title: 'CHAMPIONSHIP FINALS', subtitle: 'Day 3 • 2 Matches' };
    }
    // 32 players
    if (round === 'R32') return { title: 'ROUND OF 32', subtitle: 'Day 1 • 16 Matches' };
    if (round === 'R16') return { title: 'ROUND OF 16', subtitle: 'Day 2 • 8 Matches' };
    if (round === 'QF') return { title: 'QUARTER FINALS', subtitle: 'Day 2 • 4 Matches' };
    if (round === 'SF') return { title: 'SEMI FINALS', subtitle: 'Day 3 • 2 Matches' };
    if (round === 'F') return { title: 'CHAMPIONSHIP FINALS', subtitle: 'Day 3 • 2 Matches' };
    return { title: round, subtitle: '' };
  };

  // Helper to get first/second/third round based on playersCount
  const getRoundForDay = (day: 1 | 2 | 3) => {
    if (tournamentConfig.playersCount === 8) {
      if (day === 1) return ['QF'];
      if (day === 2) return ['SF'];
      if (day === 3) return ['F', '3RD'];
    }
    if (tournamentConfig.playersCount === 16) {
      if (day === 1) return ['R16'];
      if (day === 2) return ['QF'];
      if (day === 3) return ['SF', 'F', '3RD'];
    }
    // 32 players
    if (day === 1) return ['R32'];
    if (day === 2) return ['R16', 'QF'];
    if (day === 3) return ['SF', 'F', '3RD'];
    return [];
  };

  // Helper to fetch player
  const getPlayer = (id: string | null): Player | null => {
    if (!id) return null;
    return players.find((p) => p.id === id) || null;
  };

  // Helper to render a player row in a match card
  const renderPlayerRow = (
    playerId: string | null,
    score: number | null,
    points: number | null,
    highBreak: number | null,
    isWinner: boolean,
    placeholderText: string
  ) => {
    const p = getPlayer(playerId);

    if (!p) {
      return (
        <div className="flex items-center justify-between py-3 px-4 bg-[#04142B]/40 text-[#787E90] text-xs italic font-medium">
          <span className="truncate">{placeholderText}</span>
          <span className="font-sans text-[#787E90]/50 font-black">-</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-between py-3 px-4 transition-all duration-300 ${
          isWinner 
            ? 'bg-[#1A6DFF]/10 text-white font-bold' 
            : 'bg-[#121F32] text-[#B2B6C2]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img
              src={p.photoUrl || null}
              alt={p.name}
              className={`w-8 h-8 rounded-xl object-cover border-2 shrink-0 ${
                isWinner ? 'border-[#F1C317] shadow-[0_0_12px_rgba(241,195,23,0.3)]' : 'border-[#1A2740]'
              }`}
              referrerPolicy="no-referrer"
            />
            {isWinner && (
              <span className="absolute -top-1 -right-1 bg-[#F1C317] text-[#010C1E] p-0.5 rounded-full shadow-sm">
                <Star className="w-2.5 h-2.5 fill-current" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-black truncate flex items-center gap-x-1.5 ${isWinner ? 'text-[#EEF1F5]' : 'text-[#B2B6C2]'}`}>
              <span>{p.name}</span>
              {p.nickname && (
                <span className="text-[10px] text-[#787E90] font-sans font-medium italic">"{p.nickname}"</span>
              )}
            </p>
            {points !== null && (
              <span className="text-[10px] text-[#1A6DFF] font-black block mt-0.5">
                Pts: {points} {highBreak ? `• Break: ${highBreak}` : ''}
              </span>
            )}
          </div>
          <span className="text-[9px] bg-[#04142B] border border-[#1A2740] px-2 py-0.5 rounded-md font-sans font-black text-[#F1C317] shrink-0">
            #{p.seed}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span
            className={`font-sans font-black text-xs px-3 py-1 rounded-lg transition-all ${
              isWinner 
                ? 'bg-[#F1C317]/20 text-[#FFD43B] border border-[#F1C317]/35 font-black shadow-[0_0_10px_rgba(241,195,23,0.2)]' 
                : 'text-[#787E90] bg-[#04142B] border border-[#1A2740]'
            }`}
          >
            {score ?? 0}
          </span>
        </div>
      </div>
    );
  };

  // Helper to render a match card
  const renderMatchCard = (match: Match) => {
    const hasPlayers = match.player1Id && match.player2Id;
    const isCompleted = match.status === 'completed';

    // Find custom placeholder text mimicking the original diagram
    let p1Placeholder = 'TBD';
    let p2Placeholder = 'TBD';

    if (match.round === 'R16') {
      const matchIndex = parseInt(match.id.replace('R16-', ''), 10);
      p1Placeholder = `Winner M${matchIndex * 2 - 1}`;
      p2Placeholder = `Winner M${matchIndex * 2}`;
    } else if (match.round === 'QF') {
      const matchIndex = parseInt(match.id.replace('QF-', ''), 10);
      p1Placeholder = `Winner R16-${matchIndex * 2 - 1}`;
      p2Placeholder = `Winner R16-${matchIndex * 2}`;
    } else if (match.round === 'SF') {
      if (match.id === 'SF-1') {
        p1Placeholder = 'Winner QF-1';
        p2Placeholder = 'Winner QF-2';
      } else {
        p1Placeholder = 'Winner QF-3';
        p2Placeholder = 'Winner QF-4';
      }
    } else if (match.id === '3RD-1') {
      p1Placeholder = 'Loser SF-1';
      p2Placeholder = 'Loser SF-2';
    } else if (match.id === 'FINAL') {
      p1Placeholder = 'Winner SF-1';
      p2Placeholder = 'Winner SF-2';
    }

    const displayTime = match.scheduledTime
      ? match.scheduledTime.includes(' - ')
        ? match.scheduledTime.split(' - ')[1]
        : match.scheduledTime
      : '09:00';

    return (
      <div
        key={match.id}
        onClick={() => onSelectMatch(match.id)}
        className={`bg-[#121F32] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between border ${
          match.status === 'playing'
            ? 'border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'
            : isCompleted
            ? 'border-[#1A2740] hover:border-[#1A6DFF]/30'
            : hasPlayers
            ? 'border-[#1A2740] hover:border-[#1A6DFF]/50'
            : 'border-[#1A2740]/40 opacity-70'
        }`}
      >
        {/* Match label and header */}
        <div className="bg-[#04142B] px-4 py-2.5 flex justify-between items-center border-b border-[#1A2740]">
          <span className="text-[10px] font-sans font-black text-[#EEF1F5] uppercase tracking-[0.12em] flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 shrink-0 ${match.status === 'playing' ? 'text-[#EF4444] animate-bounce' : 'text-[#1A6DFF]'}`} />
            {match.id}
          </span>
          <span className={`text-[10px] font-sans tracking-wide font-black ${match.status === 'playing' ? 'text-[#EF4444]' : 'text-[#B2B6C2]'}`}>
            {displayTime}
          </span>
        </div>

        {/* Player slots */}
        <div className="divide-y divide-[#1A2740]/50">
          {renderPlayerRow(
            match.player1Id,
            match.score1,
            match.points1,
            match.break1,
            isCompleted && match.winnerId === match.player1Id,
            p1Placeholder
          )}
          {renderPlayerRow(
            match.player2Id,
            match.score2,
            match.points2,
            match.break2,
            isCompleted && match.winnerId === match.player2Id,
            p2Placeholder
          )}
        </div>

        {/* Start Match button or Live Now badge */}
        {hasPlayers && match.status === 'scheduled' && (
          <div className="p-3 bg-[#04142B] border-t border-[#1A2740]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStartMatch) {
                  onStartMatch(match.id);
                }
              }}
              className="w-full bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] hover:from-[#4088FF] hover:to-[#1A6DFF] text-white text-[10px] font-black py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest shadow-md hover:scale-[1.01]"
            >
              ▶ Start Match
            </button>
          </div>
        )}
        {match.status === 'playing' && (
          <div className="p-3 bg-[#EF4444]/10 border-t border-[#EF4444]/20 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-black text-[#EF4444] uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping"></span> Live Now
            </span>
            <span className="text-[9px] text-[#B2B6C2] font-bold italic">Scoring Feed Active</span>
          </div>
        )}
      </div>
    );
  };

  // Filter matches by round grouping
  const getMatchesByRound = (round: string) => {
    return matches.filter((m) => m.round === round);
  };

  // Calculate dates for each day
  const getDayDate = (day: 1 | 2 | 3) => {
    const startDate = new Date(tournamentConfig.dateRange.split(' to ')[0]);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (day - 1));
    return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper to get round titles
  const getRoundTitles = (day: 1 | 2 | 3) => {
    return getRoundForDay(day).map(round => getRoundInfo(round).title).join(' & ');
  };

  // Helper to get total matches for a day
  const getMatchesCountForDay = (day: 1 | 2 | 3) => {
    return getRoundForDay(day).reduce((acc, round) => acc + getMatchesByRound(round).length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Schedule Overview Cards */}
      {bracketView !== 'full' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((day) => {
            const isActive = bracketView === `day${day}`;
            return (
              <button
                key={day}
                onClick={() => setBracketView(`day${day}` as any)}
                className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? 'bg-[#121F32] border-[#1A6DFF] shadow-[0_8px_24px_rgba(26,109,255,0.15)]'
                    : 'bg-[#121F32]/50 border-[#1A2740] hover:border-[#1A2740]/80 hover:bg-[#121F32]'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-sans font-black tracking-[0.2em] uppercase ${isActive ? 'text-[#F1C317]' : 'text-[#787E90]'}`}>
                    DAY {day}
                  </span>
                  <span className="text-[10px] text-[#787E90] font-sans tracking-wider font-semibold">
                    {getDayDate(day as 1 | 2 | 3)}
                  </span>
                </div>
                <p className="text-sm font-sans font-black text-[#EEF1F5] uppercase tracking-wider mb-1.5 leading-snug">
                  {getRoundTitles(day as 1 | 2 | 3)}
                </p>
                <p className="text-[11px] text-[#B2B6C2] font-sans font-bold tracking-wide uppercase">
                  {getMatchesCountForDay(day as 1 | 2 | 3)} Matches
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Top filter dashboard */}
      <div className="bg-[#121F32] border border-[#1A2740] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1A6DFF]/10 border border-[#1A6DFF]/20 rounded-xl">
            <Calendar className="w-5 h-5 text-[#1A6DFF]" />
          </div>
          <span className="font-sans font-black text-base text-[#EEF1F5] uppercase tracking-[0.1em]">
            Fixture Schedule
          </span>
        </div>

        <div className="flex bg-[#04142B] p-1.5 rounded-xl border border-[#1A2740] gap-1.5 self-start md:self-auto items-center">
          <button
            onClick={() => setBracketView('full')}
            className={`text-xs font-black px-4 py-2.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              bracketView === 'full'
                ? 'bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] text-white border border-[#1A6DFF]/20 shadow-md'
                : 'text-[#B2B6C2] hover:text-[#EEF1F5] hover:bg-white/5'
            }`}
          >
            Full Bracket Tree
          </button>
          <button
            onClick={() => setBracketView('minimized')}
            className={`text-xs font-black px-4 py-2.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              bracketView === 'minimized'
                ? 'bg-gradient-to-r from-[#1A6DFF] to-[#0C48B8] text-white border border-[#1A6DFF]/20 shadow-md'
                : 'text-[#B2B6C2] hover:text-[#EEF1F5] hover:bg-white/5'
            }`}
          >
            Minimize
          </button>
        </div>
      </div>

      {/* Bracket Tree Container */}
      {(bracketView === 'full' || bracketView === 'minimized') ? (
        <div className={`overflow-x-auto pb-4 overflow-y-auto ${
          bracketView === 'full' ? 'max-h-[calc(100vh-180px)]' : 'max-h-[600px]'
        }`}>
          <div className="flex gap-8 px-2 min-w-[1280px]">
            {showRound('R32') && (
              <div className="flex-1 space-y-4">
                <div className="sticky top-0 bg-[#010C1E] z-20 py-2.5 border-b border-[#1A2740] text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">{getRoundInfo('R32').title}</p>
                  <p className="text-[10px] text-[#1A6DFF]/80 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('R32').subtitle}</p>
                </div>
                <div className="space-y-4 pr-2">
                  {getMatchesByRound('R32').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('R16') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#010C1E] z-20 py-2.5 border-b border-[#1A2740] text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">{getRoundInfo('R16').title}</p>
                  <p className="text-[10px] text-[#1A6DFF]/80 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('R16').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-8 pr-2">
                  {getMatchesByRound('R16').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('QF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#010C1E] z-20 py-2.5 border-b border-[#1A2740] text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">{getRoundInfo('QF').title}</p>
                  <p className="text-[10px] text-[#1A6DFF]/80 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('QF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-16 pr-2">
                  {getMatchesByRound('QF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('SF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#010C1E] z-20 py-2.5 border-b border-[#1A2740] text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">{getRoundInfo('SF').title}</p>
                  <p className="text-[10px] text-[#1A6DFF]/80 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('SF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-24 pr-2">
                  {getMatchesByRound('SF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('F') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#010C1E] z-20 py-2.5 border-b border-[#1A2740] text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">{getRoundInfo('F').title}</p>
                  <p className="text-[10px] text-[#1A6DFF]/80 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('F').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-16 pr-2">
                  <div>
                    <div className="text-center mb-2">
                      <span className="text-[9px] font-sans font-black text-[#FFD43B] bg-[#F1C317]/10 px-2.5 py-1 rounded border border-[#F1C317]/20 uppercase tracking-widest">
                        Grand Final Match
                      </span>
                    </div>
                    {getMatchesByRound('F').map((m) => renderMatchCard(m))}
                  </div>
                  <div className="mt-8">
                    <div className="text-center mb-2">
                      <span className="text-[9px] font-sans font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">
                        3rd Place Match
                      </span>
                    </div>
                    {getMatchesByRound('3RD').map((m) => renderMatchCard(m))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-250">
          {bracketView === 'day1' && (
            <div className="col-span-full space-y-6">
              {getRoundForDay(1).map(round => (
                <div key={round} className="space-y-4">
                  <div className="border-b border-[#1A2740] pb-2 flex items-center justify-between">
                    <h4 className="text-sm font-sans font-black text-[#1A6DFF] uppercase tracking-widest">
                      Day 1: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-[#B2B6C2] font-bold">
                      {getMatchesByRound(round).length} Matches
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bracketView === 'day2' && (
            <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {getRoundForDay(2).map(round => (
                <div key={round} className={round === 'R16' ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
                  <div className="border-b border-[#1A2740] pb-2 flex items-center justify-between">
                    <h4 className="text-sm font-sans font-black text-[#1A6DFF] uppercase tracking-widest">
                      Day 2: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-[#B2B6C2] font-bold">
                      {getMatchesByRound(round).length} Matches
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bracketView === 'day3' && (
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
              {getRoundForDay(3).map(round => (
                <div key={round} className="space-y-4">
                  <div className="border-b border-[#1A2740] pb-2 flex items-center justify-between">
                    <h4 className={`text-sm font-sans font-black uppercase tracking-widest ${round === '3RD' ? 'text-emerald-500' : 'text-[#1A6DFF]'}`}>
                      Day 3: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-[#B2B6C2] font-bold">
                      {getMatchesByRound(round).length} Match{getMatchesByRound(round).length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
