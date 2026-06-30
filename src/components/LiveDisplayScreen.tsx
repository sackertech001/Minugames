import React, { useState, useEffect } from 'react';
import { Player, Match } from '../types';
import { 
  Tv, Target, Trophy, Clock, Medal, Search, TrendingUp, Sparkles,
  Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight
} from 'lucide-react';

// Custom SVG icons for Whistle and PieChart matching the provided live score references
const WhistleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-cyan-400 shrink-0">
    <path d="M18 10h-4M5 14h7c1.7 0 3-1.3 3-3V7c0-1.7-1.3-3-3-3H7C5.3 4 4 5.3 4 7v3" />
    <path d="M15 11c0 2.2 1.8 4 4 4h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1c-2.2 0-4 1.8-4 4z" />
    <path d="M7 14H4v4c0 1.1.9 2 2 2h3v-3" />
  </svg>
);

const PieChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-rose-400 shrink-0">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v10h10" />
  </svg>
);

function ShieldBadge({ color, photoUrl, seed }: { color: 'blue' | 'red'; photoUrl?: string; seed?: number }) {
  const stripeColor = color === 'blue' ? 'bg-cyan-500/80' : 'bg-rose-500/80';
  const glowColor = color === 'blue' 
    ? 'shadow-[0_0_20px_rgba(6,182,212,0.35)] border-cyan-400/40' 
    : 'shadow-[0_0_20px_rgba(244,63,94,0.35)] border-rose-400/40';

  return (
    <div className={`relative w-20 h-24 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 p-[3px] rounded-b-[40%] rounded-t-lg shrink-0 flex items-center justify-center ${glowColor}`}>
      <div className="w-full h-full bg-[#05101E] rounded-b-[38%] rounded-t-md overflow-hidden relative flex flex-col justify-center items-center">
        {/* Striped Background */}
        <div className="absolute inset-0 flex justify-center gap-1 opacity-30 pointer-events-none">
          <div className={`w-3.5 h-full ${stripeColor}`} />
          <div className="w-3.5 h-full bg-slate-300" />
          <div className={`w-3.5 h-full ${stripeColor}`} />
          <div className="w-3.5 h-full bg-slate-300" />
          <div className={`w-3.5 h-full ${stripeColor}`} />
        </div>

        {/* Diagonal high contrast sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10 pointer-events-none" />

        {/* Player Avatar inside a circular silver rim */}
        {photoUrl ? (
          <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-b from-slate-200 to-slate-400 shadow-md z-10 overflow-hidden">
            <img 
              src={photoUrl || undefined} 
              alt="Player avatar" 
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10 text-xs font-bold text-slate-500">
            ?
          </div>
        )}

        {/* Seed indicator at the bottom */}
        {seed !== undefined && (
          <span className="absolute bottom-1 bg-[#091A2E]/90 border border-slate-600 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded text-[#D4AF37] z-10">
            S{seed}
          </span>
        )}
      </div>
    </div>
  );
}

interface SportLiveScoreboardProps {
  activeMatch: Match;
  actP1: Player | null;
  actP2: Player | null;
}

function SportLiveScoreboard({ activeMatch, actP1, actP2 }: SportLiveScoreboardProps) {
  // Deterministic stats helper
  const getMatchStats = (m: Match) => {
    const seed = m.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const highestBreak1 = m.break1 ?? (seed % 45 + 30);
    const highestBreak2 = m.break2 ?? ((seed * 3) % 45 + 25);
    const fouls1 = (seed % 4);
    const fouls2 = ((seed + 2) % 4);
    const potSuccess1 = 82 + (seed % 14);
    const potSuccess2 = 80 + ((seed + 4) % 15);
    return {
      highestBreak1,
      highestBreak2,
      fouls1,
      fouls2,
      potSuccess1,
      potSuccess2
    };
  };

  const stats = getMatchStats(activeMatch);
  
  // Frame details
  const currentFrame = activeMatch.frames && activeMatch.frames.length > 0 
    ? activeMatch.frames[activeMatch.frames.length - 1] 
    : null;
  const p1FramePoints = currentFrame ? currentFrame.player1Points : (activeMatch.points1 ? activeMatch.points1 % 100 : 67);
  const p2FramePoints = currentFrame ? currentFrame.player2Points : (activeMatch.points2 ? activeMatch.points2 % 100 : 23);

  // Duration
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!activeMatch.startTime) {
      setDuration(0);
      return;
    }

    if (activeMatch.status === 'playing') {
      const interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - activeMatch.startTime!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (activeMatch.status === 'completed') {
      if (activeMatch.endTime) {
        setDuration(Math.floor((activeMatch.endTime - activeMatch.startTime) / 1000));
      } else {
        setDuration(0);
      }
    }
  }, [activeMatch.status, activeMatch.startTime, activeMatch.endTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timeline variables
  const setsToPlay = activeMatch.frames?.length || 5;
  const completedFramesCount = activeMatch.frames?.filter(f => f.player1Points !== f.player2Points).length || 2;

  return (
    <div className="bg-gradient-to-b from-[#09152C] to-[#040C1A] border border-cyan-500/25 backdrop-blur-md shadow-[0_0_50px_-12px_rgba(6,182,212,0.25)] rounded-2xl relative overflow-hidden p-6 md:p-8 text-white select-none w-full">
      {/* Glow ambient backlights */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Center Live Indicator Capsule */}
      <div className="flex justify-center mb-6 relative z-10">
        <div className="bg-[#05101E] border border-cyan-500/20 rounded-full px-5 py-1.5 flex items-center gap-3 shadow-inner">
          <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white animate-pulse">
            LIVE
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
            {p1FramePoints} : {p2FramePoints}
          </span>
        </div>
      </div>

      {/* Main Row: Player 1, Giant Score, Player 2 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 mb-8 relative z-10">
        {/* Player 1 details */}
        <div className="flex items-center gap-4 w-full md:w-2/5 justify-center md:justify-end">
          <div className="text-center md:text-right">
            <h3 className="font-sans font-black tracking-wider text-xl sm:text-2xl md:text-3xl text-slate-100 uppercase truncate max-w-[200px]">
              {actP1 ? actP1.name : 'VACANT PLAYER'}
            </h3>
            {actP1?.nickname && (
              <p className="text-[10px] md:text-xs text-[#D4AF37]/90 font-black tracking-widest uppercase italic">
                "{actP1.nickname}"
              </p>
            )}
          </div>
          <ShieldBadge color="blue" photoUrl={actP1?.photoUrl} seed={actP1?.seed} />
        </div>

        {/* Giant Score Divider */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="flex items-center justify-center gap-4 font-black text-6xl sm:text-7xl md:text-8xl text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.45)]">
            <span>{activeMatch.score1 ?? 0}</span>
            <span className="text-cyan-500/60 font-medium text-4xl sm:text-5xl md:text-6xl animate-pulse">:</span>
            <span>{activeMatch.score2 ?? 0}</span>
          </div>
          {activeMatch.round === 'GroupStage' && activeMatch.soccerScore && (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-mono mt-2">
              <span className="bg-slate-800 px-2 py-0.5 rounded">HT: {activeMatch.soccerScore.firstHalf.player1Points}-{activeMatch.soccerScore.firstHalf.player2Points}</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">FT: {activeMatch.score1}-{activeMatch.score2}</span>
              {activeMatch.soccerScore.penalties && (
                <span className="bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded">P: ({activeMatch.soccerScore.penalties.player1Points}-{activeMatch.soccerScore.penalties.player2Points})</span>
              )}
            </div>
          )}
        </div>

        {/* Player 2 details */}
        <div className="flex items-center gap-4 w-full md:w-2/5 justify-center md:justify-start flex-row-reverse">
          <div className="text-center md:text-left">
            <h3 className="font-sans font-black tracking-wider text-xl sm:text-2xl md:text-3xl text-slate-100 uppercase truncate max-w-[200px]">
              {actP2 ? actP2.name : 'VACANT PLAYER'}
            </h3>
            {actP2?.nickname && (
              <p className="text-[10px] md:text-xs text-rose-400/90 font-black tracking-widest uppercase italic">
                "{actP2.nickname}"
              </p>
            )}
          </div>
          <ShieldBadge color="red" photoUrl={actP2?.photoUrl} seed={actP2?.seed} />
        </div>
      </div>

      {/* New Stats/Metrics row (Round, Duration, Frame Score) */}
      <div className="grid grid-cols-3 gap-6 py-6 border-t border-b border-cyan-500/10 mb-6 relative z-10 text-center">
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Round</div>
          <div className="text-xl font-black text-white">{activeMatch.round}</div>
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Duration</div>
          <div className="text-xl font-black text-white">{formatDuration(duration)}</div>
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Set Scores</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {activeMatch.frames?.map((frame, i) => (
              <div key={i} className="text-[9px] bg-white/5 px-1 rounded font-mono text-white">
                S{i+1}: {frame.player1Points}-{frame.player2Points}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frame Timeline bar at the bottom */}
      <div className="w-full max-w-xl mx-auto pt-4 relative z-10">
        <div className="relative flex items-center justify-between px-2 text-[9px] font-mono font-bold text-slate-500 mb-2">
          <span>FRAME 1</span>
          <span className="text-rose-400 font-extrabold uppercase tracking-widest animate-pulse">ACTIVE FRAME PROGRESS</span>
          <span>FRAME {setsToPlay}</span>
        </div>
        
        <div className="relative h-2.5 bg-slate-950 rounded-full border border-slate-800/80 flex items-center">
          {/* Progress fill (cyan/rose transition) */}
          <div 
            className="h-[4px] bg-gradient-to-r from-cyan-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] rounded-full transition-all duration-500 ml-1"
            style={{ width: `${Math.min(95, Math.max(5, (completedFramesCount / (setsToPlay || 1)) * 100))}%` }}
          />

          {/* Frame Notch Indicators */}
          <div className="absolute inset-x-0 h-full flex justify-between px-4 pointer-events-none items-center">
            {Array.from({ length: setsToPlay }).map((_, i) => {
              const isPast = i < completedFramesCount;
              const isCurrent = i === completedFramesCount;
              return (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full relative transition-all ${
                    isPast 
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                      : isCurrent 
                        ? 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,1)] z-10 scale-150 border border-white' 
                        : 'bg-slate-800'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-rose-500/40 rounded-full animate-ping pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LiveDisplayScreenProps {
  players: Player[];
  matches: Match[];
  showOnlyScoreboard?: boolean;
}

export default function LiveDisplayScreen({ players, matches, showOnlyScoreboard = false }: LiveDisplayScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Find completed matches
  const completedMatches = matches.filter((m) => m.status === 'completed');

  // Find live / started matches
  const liveMatches = matches.filter((m) => m.status === 'playing');

  // Autoplay / Rotation state for live matches
  const [liveIndex, setLiveIndex] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [rotationProgress, setRotationProgress] = useState(0);

  // Auto-rotate every 6 seconds if autoplay is not paused and there are multiple live matches
  useEffect(() => {
    if (liveMatches.length <= 1 || isAutoplayPaused) return;

    const interval = setInterval(() => {
      setLiveIndex((prev) => (prev + 1) % liveMatches.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [liveMatches.length, isAutoplayPaused]);

  // Autoplay visual progress bar (ticks every 100ms up to 6000ms)
  useEffect(() => {
    if (liveMatches.length <= 1 || isAutoplayPaused) {
      setRotationProgress(0);
      return;
    }

    setRotationProgress(0);
    const start = Date.now();
    const duration = 6000;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setRotationProgress(progress);
    }, 100);

    return () => clearInterval(progressInterval);
  }, [liveIndex, liveMatches.length, isAutoplayPaused]);

  // Find active/ongoing matches (if any, otherwise latest completed, or next scheduled)
  const getActiveDisplayMatch = (): Match | null => {
    if (matches.length === 0) return null;
    
    // Check if we have any completed matches (show the most recent completed match)
    const reversedCompleted = [...completedMatches].reverse();
    if (reversedCompleted.length > 0) {
      return reversedCompleted[0];
    }

    // Default to Match 1
    return matches[0];
  };

  const activeMatch = liveMatches.length > 0
    ? liveMatches[liveIndex % liveMatches.length]
    : getActiveDisplayMatch();

  const actP1 = activeMatch ? players.find((p) => p.id === activeMatch.player1Id) : null;
  const actP2 = activeMatch ? players.find((p) => p.id === activeMatch.player2Id) : null;

  // Rank players by total points gained
  const rankedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

  // Search filter
  const filteredPlayers = rankedPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.nickname && p.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.club && p.club.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Find tournament top scorer
  const topScoringPlayer = rankedPlayers.length > 0 ? rankedPlayers[0] : null;

  // Find individual match statistics for selected player
  const getPlayerMatchHistory = (playerId: string) => {
    return matches.filter(
      (m) => (m.player1Id === playerId || m.player2Id === playerId) && m.status === 'completed'
    );
  };

  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-[#05101E] text-slate-100 flex flex-col justify-between p-6 md:p-8 select-none animate-in fade-in duration-300 overflow-y-auto">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-radial-gradient from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-radial-gradient from-red-500/5 via-transparent to-transparent pointer-events-none"></div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-rose-500/15 pb-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-[#D4AF37] animate-pulse" />
            <div>
              <h1 className="text-base md:text-xl font-sans font-black text-slate-100 tracking-[0.12em] uppercase">
                Arena Broadcast Mode
              </h1>
              <p className="text-[9px] text-rose-500/80 font-sans tracking-widest font-black uppercase mt-0.5">
                {liveMatches.length > 0 
                  ? `AUTOPLAY ACTIVE • CYCLING ${liveMatches.length} LIVE TABLES` 
                  : 'STANDBY FEED • AWAITING LIVE TABLES'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {liveMatches.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-sans font-black text-rose-500 bg-rose-500/10 px-3.5 py-1.5 rounded-xl border border-rose-500/20 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Live Broadcast Feed
              </span>
            )}

            <button
              onClick={() => setIsMaximized(false)}
              className="bg-[#091A2E] hover:bg-[#0D2642] border border-rose-500/15 hover:border-rose-500/30 text-slate-200 font-sans font-black uppercase tracking-wider text-[10px] py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer z-10"
            >
              <Minimize2 className="w-4 h-4 text-[#D4AF37]" /> Minimize Board
            </button>
          </div>
        </div>

        {/* Central Display: Giant Arena Scoreboard */}
        <div className="flex-1 flex flex-col justify-center items-center my-6 md:my-8 max-w-5xl mx-auto w-full z-10">
          {activeMatch ? (
            <div className="w-full space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {liveMatches.length > 1 && !isAutoplayPaused && (
                <div className="w-full h-1 bg-slate-800 overflow-hidden rounded-full mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-[#D4AF37] to-rose-500 transition-all duration-100 ease-linear"
                    style={{ width: `${rotationProgress}%` }}
                  />
                </div>
              )}
              <SportLiveScoreboard activeMatch={activeMatch} actP1={actP1} actP2={actP2} />
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80 max-w-xl px-8">
              <Tv className="w-10 h-10 text-[#D4AF37] mx-auto mb-4 opacity-40" />
              <p className="text-base text-slate-300">No active snooker matches at the moment.</p>
              <p className="text-xs text-slate-500 mt-2">Commence matches from the organizer screen to stream scoreboard updates.</p>
            </div>
          )}
        </div>

        {/* Bottom Panel: Navigation controls and Tickers */}
        <div className="space-y-4 shrink-0 z-10">
          {/* Autoplay & Control Bar */}
          {liveMatches.length > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-[#091A2E]/80 border border-rose-500/15 px-6 py-2.5 rounded-2xl max-w-lg mx-auto shadow-lg shadow-black/20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLiveIndex((prev) => (prev - 1 + liveMatches.length) % liveMatches.length);
                    setIsAutoplayPaused(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#D4AF37] bg-[#05101E] border border-rose-500/15 hover:border-rose-500/30 rounded-lg transition-all cursor-pointer"
                  title="Previous Table"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsAutoplayPaused(!isAutoplayPaused)}
                  className="px-3 py-1.5 font-sans text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] hover:bg-[#D4AF37]/25 cursor-pointer"
                >
                  {isAutoplayPaused ? (
                    <>
                      <Play className="w-3 h-3 fill-current" /> Resume Autoplay
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 fill-current" /> Pause Autoplay
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setLiveIndex((prev) => (prev + 1) % liveMatches.length);
                    setIsAutoplayPaused(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#D4AF37] bg-[#05101E] border border-rose-500/15 hover:border-rose-500/30 rounded-lg transition-all cursor-pointer"
                  title="Next Table"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {liveMatches.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setLiveIndex(idx);
                      setIsAutoplayPaused(true);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      liveIndex % liveMatches.length === idx 
                        ? 'w-5 bg-[#D4AF37]' 
                        : 'w-2 bg-[#05101E] hover:bg-[#0D2642] border border-rose-500/10'
                    }`}
                    title={`Switch to Table ${m.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Marquee ticker */}
          {!showOnlyScoreboard && (
            <div className="bg-[#05101E] border border-rose-500/15 rounded-xl p-2.5 overflow-hidden text-center max-w-2xl mx-auto shadow-inner">
              <div className="inline-flex items-center gap-4 animate-pulse text-[9px] font-sans font-black tracking-widest text-slate-400 uppercase">
                <span className="text-red-500 animate-pulse font-black">🔴 BROADCAST STATION ACTIVE</span>
                <span>•</span>
                <span>TOP SCORER: {topScoringPlayer ? `${topScoringPlayer.name} (${topScoringPlayer.totalPoints} PTS)` : 'NONE'}</span>
                <span>•</span>
                <span className="text-[#D4AF37]/80">APPLY ONLINE TO COMPETE</span>
                <span>•</span>
                <span>COMPLETED MATCHES: {completedMatches.length} / 32</span>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!showOnlyScoreboard && liveMatches.length > 0 && (
        <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl p-5 space-y-4 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          {/* ... Live Matches Arena Bar content */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-sans font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              Ongoing Matches ({liveMatches.length})
            </span>
            {liveMatches.length > 1 && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setLiveIndex((prev) => (prev - 1 + liveMatches.length) % liveMatches.length);
                    setIsAutoplayPaused(true);
                  }}
                  className="px-3 py-1.5 text-[10px] font-sans font-black uppercase tracking-wider text-slate-300 hover:text-[#D4AF37] bg-[#05101E] border border-rose-500/15 hover:border-rose-500/30 rounded-xl cursor-pointer transition-all shadow-sm"
                  title="Previous Live Match"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => setIsAutoplayPaused(!isAutoplayPaused)}
                  className="px-4 py-1.5 text-[10px] font-sans font-black uppercase tracking-wider rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/45 text-[#D4AF37] cursor-pointer transition-all shadow-sm"
                >
                  {isAutoplayPaused ? '▶ Resume Autoplay' : '⏸ Pause Autoplay'}
                </button>
                <button
                  onClick={() => {
                    setLiveIndex((prev) => (prev + 1) % liveMatches.length);
                    setIsAutoplayPaused(true);
                  }}
                  className="px-3 py-1.5 text-[10px] font-sans font-black uppercase tracking-wider text-slate-300 hover:text-[#D4AF37] bg-[#05101E] border border-rose-500/15 hover:border-rose-500/30 rounded-xl cursor-pointer transition-all shadow-sm"
                  title="Next Live Match"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {liveMatches.map((m, index) => {
              const p1Local = players.find((p) => p.id === m.player1Id);
              const p2Local = players.find((p) => p.id === m.player2Id);
              const isActive = activeMatch?.id === m.id;
              
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setLiveIndex(index);
                    setIsAutoplayPaused(true);
                  }}
                  className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white ring-2 ring-[#D4AF37]/25 shadow-[0_0_15px_rgba(212,175,55,0.12)]'
                      : 'bg-[#05101E] border-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px] font-sans font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/25 shrink-0 uppercase tracking-wider">
                    {m.id}
                  </span>
                  <div className="text-[11px] font-sans font-black min-w-[130px] uppercase tracking-wider">
                    <div className="flex justify-between items-center gap-4">
                      <span className={`truncate max-w-[85px] ${isActive ? 'text-white font-black' : 'text-slate-400 font-bold'}`}>
                        {p1Local?.name.split(' ').slice(-1)[0] || 'P1'}
                      </span>
                      <span className="text-[#D4AF37]">{m.score1 ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5 gap-4">
                      <span className={`truncate max-w-[85px] ${isActive ? 'text-white font-black' : 'text-slate-400 font-bold'}`}>
                        {p2Local?.name.split(' ').slice(-1)[0] || 'P2'}
                      </span>
                      <span className="text-[#D4AF37]">{m.score2 ?? 0}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Broadcast Banner / Arena Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-sans font-black uppercase tracking-[0.12em] text-[#D4AF37] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            {liveMatches.length > 0 ? `Live Started Match (${liveIndex + 1} of ${liveMatches.length})` : 'CLASS 46 SNOOKER CHAMPIONSHIP Broadcast Feed'}
          </div>
          
          <button
            onClick={() => setIsMaximized(true)}
            className="bg-[#091A2E] hover:bg-[#0D2642] border border-rose-500/15 hover:border-rose-500/30 text-slate-200 font-sans font-black uppercase tracking-wider text-[10px] py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Maximize Screen
          </button>
        </div>

        {activeMatch ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <SportLiveScoreboard activeMatch={activeMatch} actP1={actP1} actP2={actP2} />
          </div>
        ) : (
          <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl p-10 text-center text-slate-400 shadow-xl">
            <Tv className="w-8 h-8 text-[#D4AF37] mx-auto mb-3 opacity-40 animate-pulse" />
            No active snooker matches at the moment. Commence a match to display live broadcast data.
          </div>
        )}
      </div>

      {!showOnlyScoreboard && (
        <>
            {/* Quick stats ribbons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* ... stats code */}
            </div>

            {/* Main Split Screen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ... stats/feed code */}
            </div>
        </>
      )}
    </div>
  );
}
