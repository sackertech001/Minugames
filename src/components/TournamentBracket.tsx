import React, { useState } from 'react';
import { Player, Match, TournamentConfig } from '../types';
import { Zap, Calendar, Play, Trophy, Users } from 'lucide-react';

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
      if (round === 'QF') return { title: 'ROUND OF 8', subtitle: 'Day 1 • 4 Matches' };
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
        <div className="flex items-center justify-between py-2.5 px-3.5 bg-[#05101E]/50 text-slate-500 text-xs italic font-medium">
          <span className="truncate">{placeholderText}</span>
          <span className="font-sans text-slate-600 font-bold">-</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-between py-2.5 px-3.5 transition-all duration-200 ${
          isWinner 
            ? 'bg-rose-500/5 text-white' 
            : 'bg-[#091A2E] text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img
              src={p.photoUrl || undefined}
              alt={p.name}
              className={`w-7 h-7 rounded-lg object-cover border shrink-0 ${
                isWinner ? 'border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-rose-500/15'
              }`}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-black truncate flex flex-wrap items-baseline gap-x-1.5 ${isWinner ? 'text-white' : 'text-slate-200'}`}>
              <span>{p.name}</span>
              {p.nickname && (
                <span className="text-[10px] text-slate-400 font-sans font-medium italic">"{p.nickname}"</span>
              )}
            </p>
            {points !== null && (
              <span className="text-[10px] text-rose-500/60 font-bold block mt-0.5">
                Pts: {points} {highBreak ? `• Break: ${highBreak}` : ''}
              </span>
            )}
          </div>
          <span className="text-[9px] bg-[#05101E] border border-rose-500/15 px-1.5 py-0.5 rounded font-sans font-black text-rose-500 shrink-0">
            #{p.seed}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span
            className={`font-sans font-black text-sm px-2.5 py-1 rounded-md transition-all ${
              isWinner 
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30 font-black shadow-[0_0_8px_rgba(239,68,68,0.15)]' 
                : 'text-slate-400 bg-slate-500/5 border border-white/5'
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
        className={`bg-[#091A2E] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between border ${
          match.status === 'playing'
            ? 'border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
            : isCompleted
            ? 'border-rose-500/15 hover:border-rose-500/30'
            : hasPlayers
            ? 'border-rose-500/20 hover:border-rose-500/40'
            : 'border-rose-500/10 opacity-70'
        }`}
      >
        {/* Match label and header */}
        <div className="bg-[#05101E] px-3.5 py-2 flex justify-between items-center border-b border-rose-500/15">
          <span className="text-[10px] font-sans font-black text-slate-300 uppercase tracking-[0.1em] flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-rose-500 shrink-0" />
            {match.id}
          </span>
          <span className="text-[10px] text-rose-500 font-sans tracking-wide font-black">
            {displayTime}
          </span>
        </div>

        {/* Player slots */}
        <div className="divide-y divide-rose-500/10">
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
          <div className="p-2.5 bg-[#05101E] border-t border-rose-500/10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStartMatch) {
                  onStartMatch(match.id);
                }
              }}
              className="w-full bg-[#1A1813] hover:bg-[#252119] text-[#F59E0B] hover:text-[#FBBF24] border border-[#F59E0B]/20 hover:border-[#F59E0B]/40 text-[10px] font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest shadow-[0_0_12px_rgba(245,158,11,0.05)]"
            >
              <span className="text-xs">▶</span> Start Match
            </button>
          </div>
        )}
        {match.status === 'playing' && (
          <div className="p-2.5 bg-rose-500/5 border-t border-rose-500/10 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span> Live Now
            </span>
            <span className="text-[9px] text-slate-400 font-bold italic">Scoring Active</span>
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
      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((day) => {
          const isActive = bracketView === `day${day}`;
          return (
            <button
              key={day}
              onClick={() => setBracketView(`day${day}` as any)}
              className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border ${
                isActive
                  ? 'bg-[#05101E] border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'bg-[#091A2E]/70 border-rose-500/10 hover:border-rose-500/25 hover:bg-[#05101E]/40'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[11px] font-sans font-black tracking-[0.2em] uppercase ${isActive ? 'text-rose-500' : 'text-slate-400'}`}>
                  DAY {day}
                </span>
                <span className="text-[10px] text-slate-500 font-sans tracking-wider font-semibold">
                  {getDayDate(day as 1 | 2 | 3)}
                </span>
              </div>
              <p className="text-sm font-sans font-black text-white uppercase tracking-wider mb-1.5 leading-snug">
                {getRoundTitles(day as 1 | 2 | 3)}
              </p>
              <p className="text-[11px] text-slate-500 font-sans font-bold tracking-wide uppercase">
                {getMatchesCountForDay(day as 1 | 2 | 3)} Matches
              </p>
            </button>
          );
        })}
      </div>

      {/* Top filter dashboard */}
      <div className="bg-[#091A2E] border border-rose-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <Calendar className="w-5 h-5 text-rose-500" />
          </div>
          <span className="font-sans font-black text-base text-white uppercase tracking-[0.1em]">
            Fixture Schedule
          </span>
        </div>

        <div className="flex bg-[#05101E] p-1.5 rounded-xl border border-rose-500/10 gap-1.5 self-start md:self-auto items-center">
          <button
            onClick={() => setBracketView('full')}
            className={`text-xs font-black px-4 py-2 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
              bracketView === 'full'
                ? 'bg-gradient-to-r from-rose-950 via-rose-600 to-rose-950 text-white border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Full Bracket Tree
          </button>
          {bracketView !== 'minimized' && (
            <button
              onClick={() => setBracketView('minimized')}
              className="text-xs font-black px-4 py-2 rounded-lg transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-white/5 uppercase tracking-wider"
            >
              Minimize
            </button>
          )}
        </div>
      </div>

      {/* Bracket Tree Container */}
      {bracketView === 'minimized' ? null : bracketView === 'full' ? (
        <div className="overflow-x-auto pb-4 max-h-[750px] overflow-y-auto">
          <div className="flex gap-8 px-2 min-w-[1280px]">
            {showRound('R32') && (
              <div className="flex-1 space-y-4">
                <div className="sticky top-0 bg-[#05101E] z-20 py-2.5 border-b border-rose-500/15 text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-slate-100 uppercase tracking-widest">{getRoundInfo('R32').title}</p>
                  <p className="text-[10px] text-rose-500/60 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('R32').subtitle}</p>
                </div>
                <div className="space-y-4 pr-2">
                  {getMatchesByRound('R32').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('R16') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#05101E] z-20 py-2.5 border-b border-rose-500/15 text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-slate-100 uppercase tracking-widest">{getRoundInfo('R16').title}</p>
                  <p className="text-[10px] text-rose-500/60 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('R16').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-8 pr-2">
                  {getMatchesByRound('R16').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('QF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#05101E] z-20 py-2.5 border-b border-rose-500/15 text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-slate-100 uppercase tracking-widest">{getRoundInfo('QF').title}</p>
                  <p className="text-[10px] text-rose-500/60 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('QF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-16 pr-2">
                  {getMatchesByRound('QF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('SF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#05101E] z-20 py-2.5 border-b border-rose-500/15 text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-slate-100 uppercase tracking-widest">{getRoundInfo('SF').title}</p>
                  <p className="text-[10px] text-rose-500/60 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('SF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-24 pr-2">
                  {getMatchesByRound('SF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('F') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-[#05101E] z-20 py-2.5 border-b border-rose-500/15 text-center mb-4 transition-colors">
                  <p className="text-xs font-sans font-black text-slate-100 uppercase tracking-widest">{getRoundInfo('F').title}</p>
                  <p className="text-[10px] text-rose-500/60 font-sans tracking-wider font-bold mt-0.5">{getRoundInfo('F').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-16 pr-2">
                  <div>
                    <div className="text-center mb-2">
                      <span className="text-[9px] font-sans font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-widest">
                        Grand Final Match
                      </span>
                    </div>
                    {getMatchesByRound('F').map((m) => renderMatchCard(m))}
                  </div>
                  <div>
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
                  <div className="border-b border-rose-500/15 pb-2 flex items-center justify-between">
                    <h4 className="text-sm font-sans font-black text-rose-500 uppercase tracking-widest">
                      Day 1: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
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
                  <div className="border-b border-rose-500/15 pb-2 flex items-center justify-between">
                    <h4 className="text-sm font-sans font-black text-rose-500 uppercase tracking-widest">
                      Day 2: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
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
                  <div className="border-b border-rose-500/15 pb-2 flex items-center justify-between">
                    <h4 className={`text-sm font-sans font-black uppercase tracking-widest ${round === '3RD' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Day 3: {getRoundInfo(round).title}
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
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
