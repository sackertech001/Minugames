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
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50/50 dark:bg-[#0F1115]/30 text-slate-400 dark:text-[#6B7280] text-xs italic">
          <span className="truncate">{placeholderText}</span>
          <span className="font-mono text-slate-400/60 dark:text-[#6B7280]/60">-</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-between py-2 px-3 transition-colors ${
          isWinner 
            ? 'bg-accent-blue/10 text-white font-bold' 
            : 'bg-white/5 text-text-secondary'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={p.photoUrl}
            alt={p.name}
            className={`w-6 h-6 rounded object-cover border shrink-0 ${
              isWinner ? 'border-accent-blue' : 'border-white/10'
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs truncate text-white">
              {p.name}{' '}
              {p.nickname && (
                <span className="text-[10px] text-text-muted font-normal italic">"{p.nickname}"</span>
              )}
            </p>
            {points !== null && (
              <span className="text-[9px] text-text-muted font-normal block -mt-0.5 font-mono">
                Pts: {points}
              </span>
            )}
          </div>
          <span className="text-[9px] bg-bg-tertiary border border-white/5 px-1 rounded font-mono text-accent-blue shrink-0">
            #{p.seed}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span
            className={`font-mono text-xs px-1.5 py-0.5 rounded ${
              isWinner ? 'bg-accent-blue text-white font-bold' : 'text-text-muted'
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

    return (
      <div
        key={match.id}
        onClick={() => onSelectMatch(match.id)}
        className={`glass-panel cursor-pointer transition-all duration-300 hover:border-accent-blue/50 hover:shadow-xl hover:shadow-accent-blue/10 hover:scale-[1.02] flex flex-col justify-between border ${
          isCompleted
            ? 'border-emerald-500/20'
            : hasPlayers
            ? 'border-accent-blue/40 animate-pulse-subtle'
            : 'border-white/5'
        }`}
      >
        {/* Match label and header */}
        <div className="bg-white/5 px-3 py-1.5 flex justify-between items-center border-b border-white/5">
          <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-accent-blue" />
            {match.id}
          </span>
          <span className="text-[9px] text-text-muted font-mono font-medium">
            {match.scheduledTime ? match.scheduledTime.split(' - ')[1] : ''}
          </span>
        </div>

        {/* Player slots */}
        <div className="divide-y divide-slate-100 dark:divide-[#2A2E37]/40">
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
          <div className="p-2 bg-slate-50 dark:bg-[#12151A] border-t border-slate-100 dark:border-[#2A2E37]/40">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStartMatch) {
                  onStartMatch(match.id);
                }
              }}
              className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0F1115] border border-[#D4AF37]/35 text-[10px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" /> Start Match
            </button>
          </div>
        )}
        {match.status === 'playing' && (
          <div className="p-2 bg-[#D4AF37]/5 border-t border-slate-100 dark:border-[#2A2E37]/40 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider animate-pulse-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping"></span> Live Now
            </span>
            <span className="text-[9px] text-slate-400 dark:text-[#6B7280] font-semibold italic">Scoring Active</span>
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
        {[1, 2, 3].map((day) => (
          <button
            key={day}
            onClick={() => setBracketView(`day${day}` as any)}
            className={`glass-panel p-4 text-left transition-all hover:border-accent-blue/50 ${
              bracketView === `day${day}` ? 'border-accent-blue bg-accent-blue/5' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-accent-blue uppercase font-display">Day {day}</span>
              <span className="text-xs text-text-muted font-mono">{getDayDate(day as 1 | 2 | 3)}</span>
            </div>
            <p className="text-sm font-bold text-white mb-1">{getRoundTitles(day as 1 | 2 | 3)}</p>
            <p className="text-[10px] text-text-muted">{getMatchesCountForDay(day as 1 | 2 | 3)} Matches</p>
          </button>
        ))}
      </div>

      {/* Top filter dashboard */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-blue" />
          <span className="font-display font-bold text-lg text-white uppercase tracking-wider">
            Fixture Schedule
          </span>
        </div>

        <div className="flex bg-bg-secondary p-1 rounded-xl border border-white/5 gap-1 self-start md:self-auto transition-colors">
          <button
            onClick={() => setBracketView('full')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              bracketView === 'full'
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                : 'text-text-muted hover:text-white'
            }`}
          >
            Full Bracket Tree
          </button>
          {bracketView !== 'minimized' && (
            <button
              onClick={() => setBracketView('minimized')}
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer text-text-muted hover:text-white hover:bg-white/10"
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
                <div className="sticky top-0 bg-bg-primary z-20 py-2 border-b border-white/5 text-center mb-4 transition-colors">
                  <p className="text-xs font-bold text-accent-blue uppercase tracking-widest font-display">{getRoundInfo('R32').title}</p>
                  <p className="text-[10px] text-text-muted">{getRoundInfo('R32').subtitle}</p>
                </div>
                <div className="space-y-4 pr-2">
                  {getMatchesByRound('R32').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('R16') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-bg-primary z-20 py-2 border-b border-white/5 text-center mb-4 transition-colors">
                  <p className="text-xs font-bold text-accent-blue uppercase tracking-widest font-display">{getRoundInfo('R16').title}</p>
                  <p className="text-[10px] text-text-muted">{getRoundInfo('R16').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-8 pr-2">
                  {getMatchesByRound('R16').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('QF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-bg-primary z-20 py-2 border-b border-white/5 text-center mb-4 transition-colors">
                  <p className="text-xs font-bold text-accent-blue uppercase tracking-widest font-display">{getRoundInfo('QF').title}</p>
                  <p className="text-[10px] text-text-muted">{getRoundInfo('QF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-16 pr-2">
                  {getMatchesByRound('QF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('SF') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-bg-primary z-20 py-2 border-b border-white/5 text-center mb-4 transition-colors">
                  <p className="text-xs font-bold text-accent-blue uppercase tracking-widest font-display">{getRoundInfo('SF').title}</p>
                  <p className="text-[10px] text-text-muted">{getRoundInfo('SF').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-around space-y-24 pr-2">
                  {getMatchesByRound('SF').map((m) => renderMatchCard(m))}
                </div>
              </div>
            )}
            {showRound('F') && (
              <div className="flex-1 space-y-4 flex flex-col">
                <div className="sticky top-0 bg-bg-primary z-20 py-2 border-b border-white/5 text-center mb-4 transition-colors">
                  <p className="text-xs font-bold text-accent-blue uppercase tracking-widest font-display">{getRoundInfo('F').title}</p>
                  <p className="text-[10px] text-text-muted">{getRoundInfo('F').subtitle}</p>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-16 pr-2">
                  <div>
                    <div className="text-center mb-2">
                      <span className="text-[9px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20 uppercase font-mono">
                        Grand Final Match
                      </span>
                    </div>
                    {getMatchesByRound('F').map((m) => renderMatchCard(m))}
                  </div>
                  <div>
                    <div className="text-center mb-2">
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
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
            <div className="col-span-full space-y-4">
              {getRoundForDay(1).map(round => (
                <div key={round}>
                  <div className="border-b border-slate-200 dark:border-[#2A2E37] pb-2">
                    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest font-serif">Day 1: {getRoundInfo(round).title}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bracketView === 'day2' && (
            <>
              {getRoundForDay(2).map(round => (
                <div key={round} className={round === 'R16' ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
                  <div className="border-b border-slate-200 dark:border-[#2A2E37] pb-2">
                    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest font-serif">Day 2: {getRoundInfo(round).title}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </>
          )}

          {bracketView === 'day3' && (
            <>
              {getRoundForDay(3).map(round => (
                <div key={round} className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-[#2A2E37] pb-2">
                    <h4 className={`text-sm font-bold uppercase tracking-widest font-serif ${round === '3RD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#D4AF37]'}`}>
                      Day 3: {getRoundInfo(round).title}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {getMatchesByRound(round).map((m) => renderMatchCard(m))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
