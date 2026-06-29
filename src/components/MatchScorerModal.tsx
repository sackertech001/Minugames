import React, { useState, useEffect } from 'react';
import { Player, Match, FrameScore, SoccerScore } from '../types';
import { X, AlertTriangle, Sparkles, Trophy, ArrowRight, Settings, Play } from 'lucide-react';

interface MatchScorerModalProps {
  match: Match | null;
  players: Player[];
  formatType: 'knockout' | 'group';
  onClose: () => void;
  onSaveScore: (
    matchId: string,
    score1: number,
    score2: number,
    points1: number,
    points2: number,
    break1: number,
    break2: number,
    frames: FrameScore[],
    winnerId: string,
    loserId: string,
    soccerScore?: SoccerScore
  ) => void;
  onUpdateLiveScore?: (
    matchId: string,
    frames: FrameScore[],
    score1: number,
    score2: number,
    points1: number,
    points2: number,
    soccerScore?: SoccerScore
  ) => void;
  onStartMatch?: (matchId: string) => void;
}

export default function MatchScorerModal({
  match,
  players,
  formatType,
  onClose,
  onSaveScore,
  onUpdateLiveScore,
  onStartMatch,
}: MatchScorerModalProps) {
  const [gamesCount, setGamesCount] = useState<number>(3);
  const [setScores, setSetScores] = useState<FrameScore[]>([]);
  const [soccerScores, setSoccerScores] = useState<SoccerScore>({
    firstHalf: { player1Points: 0, player2Points: 0 },
    secondHalf: { player1Points: 0, player2Points: 0 },
  });
  const [error, setError] = useState('');

  // Find player details
  const p1 = match ? players.find((p) => p.id === match.player1Id) : null;
  const p2 = match ? players.find((p) => p.id === match.player2Id) : null;

  // Initialize form state when match ID changes to keep local state stable during live scoring
  useEffect(() => {
    if (match) {
      setError('');
      if (formatType === 'group' && match.soccerScore) {
        setSoccerScores(match.soccerScore);
      } else {
        // Default to existing frames if present, otherwise default to 3 games
        const existingFrames = match.frames || [];
        const count = existingFrames.length > 0 ? existingFrames.length : 3;
        setGamesCount(count);

        if (existingFrames.length > 0) {
          setSetScores([...existingFrames]);
        } else {
          // Initialize with default empty scores
          const initialScores: FrameScore[] = Array.from({ length: count }, () => ({
            player1Points: 0,
            player2Points: 0,
          }));
          setSetScores(initialScores);
        }
      }
    }
  }, [match?.id, formatType]);

  // Helper to trigger live update up to App state for display board
  const triggerLiveUpdate = (updatedScores: FrameScore[] | null = null, updatedSoccerScores: SoccerScore | null = null) => {
    if (match && match.status === 'playing' && onUpdateLiveScore) {
      const frames = updatedScores || match.frames || [];
      const score1 = formatType === 'group' 
        ? (updatedSoccerScores?.firstHalf.player1Points || 0) + (updatedSoccerScores?.secondHalf.player1Points || 0) 
        : frames.reduce((sum, score) => sum + (score.player1Points > score.player2Points ? 1 : 0), 0);
      const score2 = formatType === 'group' 
        ? (updatedSoccerScores?.firstHalf.player2Points || 0) + (updatedSoccerScores?.secondHalf.player2Points || 0) 
        : frames.reduce((sum, score) => sum + (score.player2Points > score.player1Points ? 1 : 0), 0);
      const points1 = formatType === 'group'
        ? (updatedSoccerScores?.firstHalf.player1Points || 0) + (updatedSoccerScores?.secondHalf.player1Points || 0) 
        : frames.reduce((sum, score) => sum + score.player1Points, 0);
      const points2 = formatType === 'group'
        ? (updatedSoccerScores?.firstHalf.player2Points || 0) + (updatedSoccerScores?.secondHalf.player2Points || 0) 
        : frames.reduce((sum, score) => sum + score.player2Points, 0);

      onUpdateLiveScore(match.id, frames, score1, score2, points1, points2, formatType === 'group' ? (updatedSoccerScores || soccerScores) : undefined);
    }
  };

  // Handle game/set count changes
  const handleGamesCountChange = (newCount: number) => {
    const count = Math.max(1, Math.min(11, newCount));
    setGamesCount(count);
    
    const updated = [...setScores];
    if (updated.length < count) {
      // Grow array
      while (updated.length < count) {
        updated.push({ player1Points: 0, player2Points: 0 });
      }
    } else if (updated.length > count) {
      // Shrink array
      updated.splice(count);
    }
    setSetScores(updated);
    triggerLiveUpdate(updated);
  };

  if (!match) return null;

  const isReady = p1 && p2;

  // Real-time calculation of set wins and points
  const calculatedP1SetsWon = formatType === 'group'
    ? (soccerScores.firstHalf.player1Points + soccerScores.secondHalf.player1Points + (soccerScores.extraTime?.player1Points || 0) + (soccerScores.penalties?.player1Points || 0))
    : setScores.reduce((sum, score) => sum + (score.player1Points > score.player2Points ? 1 : 0), 0);
  
  const calculatedP2SetsWon = formatType === 'group'
    ? (soccerScores.firstHalf.player2Points + soccerScores.secondHalf.player2Points + (soccerScores.extraTime?.player2Points || 0) + (soccerScores.penalties?.player2Points || 0))
    : setScores.reduce((sum, score) => sum + (score.player2Points > score.player1Points ? 1 : 0), 0);

  const calculatedP1TotalPoints = formatType === 'group'
    ? calculatedP1SetsWon
    : setScores.reduce((sum, score) => sum + score.player1Points, 0);

  const calculatedP2TotalPoints = formatType === 'group'
    ? calculatedP2SetsWon
    : setScores.reduce((sum, score) => sum + score.player2Points, 0);

  // Auto-Simulate simple points for testing
  const handleSimulate = () => {
    if (!isReady) return;

    const simulatedScores: FrameScore[] = Array.from({ length: gamesCount }, () => {
      const p1WinsSet = Math.random() > 0.5;
      const winnerPoints = Math.floor(Math.random() * 40) + 40; // 40-80 points
      const loserPoints = Math.floor(Math.random() * (winnerPoints - 10)) + 10; // strictly less than winner

      return {
        player1Points: p1WinsSet ? winnerPoints : loserPoints,
        player2Points: p1WinsSet ? loserPoints : winnerPoints,
      };
    });

    setSetScores(simulatedScores);
    triggerLiveUpdate(simulatedScores);
  };

  // Declare winner of match and proceed
  const handleDeclareWinner = (winnerId: string) => {
    if (!isReady) return;

    let finalWinnerId = winnerId;
    let finalLoserId = winnerId === p1.id ? p2.id : p1.id;
    let finalScore1 = calculatedP1SetsWon;
    let finalScore2 = calculatedP2SetsWon;

    if (winnerId === 'draw') {
        finalWinnerId = 'draw';
        finalLoserId = 'draw';
        // Ensure scores are equal for draw
        finalScore1 = Math.max(calculatedP1SetsWon, calculatedP2SetsWon);
        finalScore2 = finalScore1;
    }

    // Use current calculated tallies
    onSaveScore(
      match.id,
      finalScore1,
      finalScore2,
      calculatedP1TotalPoints,
      calculatedP2TotalPoints,
      0, // break1 removed/unused
      0, // break2 removed/unused
      setScores,
      finalWinnerId,
      finalLoserId,
      formatType === 'group' ? soccerScores : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05101E]/85 backdrop-blur-md">
      <div className="bg-[#091A2E] border border-rose-500/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/15 px-6 py-4 bg-[#05101E]">
          <div>
            <span className="text-[9px] font-sans font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest">
              {match.round === 'R32' && 'Round of 32'}
              {match.round === 'R16' && 'Round of 16'}
              {match.round === 'QF' && 'Quarter Finals'}
              {match.round === 'SF' && 'Semi Finals'}
              {match.round === '3RD' && '3rd Place Match'}
              {match.round === 'F' && 'Grand Final'}
            </span>
            <h3 className="font-sans font-black text-sm md:text-base text-slate-100 mt-1.5 uppercase tracking-wider flex items-center gap-2">
              {match.label} <span className="text-rose-500/60 text-xs font-bold tracking-widest">({match.scheduledTime})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-[#091A2E] border border-rose-500/10 hover:border-rose-500/30 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isReady ? (
          <div className="p-10 text-center bg-[#091A2E]">
            <AlertTriangle className="w-12 h-12 text-[#D4AF37] mx-auto mb-4 animate-pulse" />
            <p className="text-slate-100 font-sans font-black text-sm uppercase tracking-wider">Awaiting Prior Matches</p>
            <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto font-sans leading-relaxed">
              This match is scheduled, but the participating players haven't advanced from the previous rounds yet. Complete previous matches to fill this slot!
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-[#05101E] hover:bg-[#0D2642] border border-rose-500/15 text-slate-300 hover:text-white font-sans font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Back to Brackets
            </button>
          </div>
        ) : (
          <div className="bg-[#091A2E] overflow-y-auto max-h-[80vh]">
            <div className="p-6 space-y-6">
              
              {/* Scoreboard Summary Display */}
              <div className="bg-[#05101E] border border-rose-500/15 rounded-2xl p-5 flex items-center justify-between shadow-inner">
                {/* Player 1 summary */}
                <div className="flex flex-col items-center text-center w-5/12">
                  <div className="relative p-1 rounded-full bg-gradient-to-b from-[#D4AF37] to-transparent shadow-lg shadow-black/40">
                    <img
                      src={p1.photoUrl}
                      alt={p1.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#05101E]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 text-[8px] font-sans font-black text-[#D4AF37] bg-[#05101E] px-1.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      P1
                    </span>
                  </div>
                  <h4 className="text-xs font-sans font-black text-slate-100 mt-3 truncate w-full uppercase tracking-wider">{p1.name}</h4>
                </div>

                {/* Score VS Circle */}
                <div className="flex flex-col items-center justify-center w-2/12">
                  <div className="text-[10px] font-sans font-black text-rose-500/80 tracking-widest uppercase mb-1.5">VS</div>
                  <div className="flex items-center gap-1.5 bg-[#091A2E] border border-rose-500/15 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#D4AF37] shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                    <span>{calculatedP1SetsWon}</span>
                    <span className="opacity-40">-</span>
                    <span>{calculatedP2SetsWon}</span>
                  </div>
                </div>

                {/* Player 2 summary */}
                <div className="flex flex-col items-center text-center w-5/12">
                  <div className="relative p-1 rounded-full bg-gradient-to-b from-[#D4AF37] to-transparent shadow-lg shadow-black/40">
                    <img
                      src={p2.photoUrl}
                      alt={p2.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#05101E]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 text-[8px] font-sans font-black text-[#D4AF37] bg-[#05101E] px-1.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      P2
                    </span>
                  </div>
                  <h4 className="text-xs font-sans font-black text-slate-100 mt-3 truncate w-full uppercase tracking-wider">{p2.name}</h4>
                </div>
              </div>

              {/* Start Match Prompt Banner if scheduled */}
              {match.status === 'scheduled' && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-rose-500 uppercase tracking-widest block">Match Status: Scheduled</span>
                    <h4 className="text-sm font-sans font-black text-slate-100 uppercase tracking-wide">Ready to commence this matchup?</h4>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      Starting the match will activate live broadcast telemetry on the general display boards in real-time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onStartMatch) {
                        onStartMatch(match.id);
                      }
                    }}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-sans font-black text-xs uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" /> Start Match Now
                  </button>
                </div>
              )}

              {/* Number of Games/Sets Configuration */}
              <div className="bg-[#05101E] border border-rose-500/15 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
                  <div>
                    <h5 className="text-xs font-sans font-black text-slate-200 uppercase tracking-wider">Match Set Configuration</h5>
                    <p className="text-[10px] text-rose-500/70 font-sans uppercase tracking-widest mt-0.5">Determine how many sets are played in this match</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {[1, 3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={match.status === 'completed'}
                      onClick={() => handleGamesCountChange(num)}
                      className={`px-3 py-1.5 text-[10px] font-sans font-black uppercase tracking-wider rounded-lg transition-all border ${
                        gamesCount === num
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950 font-black shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                          : 'bg-[#091A2E] border-rose-500/10 text-slate-400 hover:border-rose-500/25 hover:text-slate-200'
                      }`}
                    >
                      {num} Sets
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Sets/Periods Inputs */}
              <div className="space-y-3.5">
                <h5 className="text-xs font-sans font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/15 pb-1">
                  {formatType === 'group' ? 'Log Points per Period' : 'Log Points per Set'}
                </h5>
                <div className="grid grid-cols-1 gap-3.5 max-h-[250px] overflow-y-auto pr-1">
                  {formatType === 'group' ? (
                    <>
                      {['firstHalf', 'secondHalf', 'extraTime', 'penalties'].map((period) => (
                        <div key={period} className="bg-[#05101E] border border-rose-500/15 p-3 rounded-xl flex items-center justify-between gap-4 hover:border-rose-500/25 transition-all">
                          <span className="font-sans text-[11px] font-black text-slate-300 uppercase tracking-wider w-24 capitalize">{period.replace(/([A-Z])/g, ' $1')}</span>
                          <div className="flex items-center gap-2">
                             <input type="number" disabled={match.status === 'completed'} value={soccerScores[period as keyof SoccerScore]?.player1Points || ''} onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               const updated = {...soccerScores, [period]: {...soccerScores[period as keyof SoccerScore], player1Points: val}};
                               setSoccerScores(updated);
                               triggerLiveUpdate(null, updated);
                             }} className="w-16 text-center font-mono font-bold text-xs rounded-lg py-1 bg-[#091A2E] border border-rose-500/15 text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-rose-500/50"/>
                             <span className="font-black text-rose-500/40 text-xs">:</span>
                             <input type="number" disabled={match.status === 'completed'} value={soccerScores[period as keyof SoccerScore]?.player2Points || ''} onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               const updated = {...soccerScores, [period]: {...soccerScores[period as keyof SoccerScore], player2Points: val}};
                               setSoccerScores(updated);
                               triggerLiveUpdate(null, updated);
                             }} className="w-16 text-center font-mono font-bold text-xs rounded-lg py-1 bg-[#091A2E] border border-rose-500/15 text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-rose-500/50"/>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    setScores.map((score, idx) => (
                        <div key={idx} className="bg-[#05101E] border border-rose-500/15 p-3 rounded-xl flex items-center justify-between gap-4 hover:border-rose-500/25 transition-all">
                          <span className="font-sans text-[11px] font-black text-slate-300 uppercase tracking-wider w-16">Set {idx + 1}</span>
                          <div className="flex items-center justify-end gap-3 flex-1">
                             <div className="flex items-center gap-2">
                               <input type="number" disabled={match.status === 'completed'} value={score.player1Points || ''} onChange={(e) => {
                                 const val = Math.max(0, parseInt(e.target.value) || 0);
                                 const next = [...setScores];
                                 next[idx] = { ...next[idx], player1Points: val };
                                 setSetScores(next);
                                 triggerLiveUpdate(next);
                               }} className="w-16 text-center font-mono font-bold text-xs rounded-lg py-1.5 bg-[#091A2E] border border-rose-500/15 text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-rose-500/50"/>
                             </div>
                             <span className="font-black text-rose-500/40 text-xs">:</span>
                             <div className="flex items-center gap-2">
                               <input type="number" disabled={match.status === 'completed'} value={score.player2Points || ''} onChange={(e) => {
                                 const val = Math.max(0, parseInt(e.target.value) || 0);
                                 const next = [...setScores];
                                 next[idx] = { ...next[idx], player2Points: val };
                                 setSetScores(next);
                                 triggerLiveUpdate(next);
                               }} className="w-16 text-center font-mono font-bold text-xs rounded-lg py-1.5 bg-[#091A2E] border border-rose-500/15 text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-rose-500/50"/>
                             </div>
                          </div>
                        </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action: click button to declare winner and move them to the next round */}
              {match.status !== 'completed' && (
                <div className="border-t border-rose-500/15 pt-5 space-y-3.5">
                  <div className="text-center">
                    <h5 className="text-xs font-sans font-black text-rose-500 uppercase tracking-widest">
                      DECLARE MATCH WINNER & ADVANCE
                    </h5>
                    <p className="text-[10px] text-rose-500/70 font-sans uppercase tracking-widest mt-0.5">
                      Click the corresponding button to officially declare the winner and advance them to the next bracket round
                    </p>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Button for Player 1 Winner */}
                  <button
                    type="button"
                    onClick={() => handleDeclareWinner(p1.id)}
                    className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      calculatedP1SetsWon > calculatedP2SetsWon
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 ring-2 ring-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                        : 'bg-[#05101E] border-rose-500/15 text-slate-300 hover:border-rose-500/30 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-5 h-5 shrink-0 text-[#D4AF37]" />
                    <div className="font-sans font-black text-xs uppercase tracking-wider truncate w-full">
                      Declare {p1.name.split(' ')[0]} Winner
                    </div>
                    {calculatedP1SetsWon > calculatedP2SetsWon && (
                      <span className="text-[8px] font-sans font-black uppercase bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded tracking-widest">
                        Recommended
                      </span>
                    )}
                  </button>

                  {/* Button for Player 2 Winner */}
                  <button
                    type="button"
                    onClick={() => handleDeclareWinner(p2.id)}
                    className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      calculatedP2SetsWon > calculatedP1SetsWon
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 ring-2 ring-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                        : 'bg-[#05101E] border-rose-500/15 text-slate-300 hover:border-rose-500/30 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-5 h-5 shrink-0 text-[#D4AF37]" />
                    <div className="font-sans font-black text-xs uppercase tracking-wider truncate w-full">
                      Declare {p2.name.split(' ')[0]} Winner
                    </div>
                    {calculatedP2SetsWon > calculatedP1SetsWon && (
                      <span className="text-[8px] font-sans font-black uppercase bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded tracking-widest">
                        Recommended
                      </span>
                    )}
                  </button>
                </div>

                {/* Button for Draw */}
                <button
                    type="button"
                    onClick={() => handleDeclareWinner('draw')}
                    className="w-full mt-4 p-3 rounded-xl border border-rose-500/15 bg-[#05101E] text-slate-300 hover:border-rose-500/35 hover:text-white text-center flex items-center justify-center gap-2 cursor-pointer transition-all font-sans font-black text-xs uppercase tracking-wider"
                  >
                    <Trophy className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <div>
                      Declare Draw
                    </div>
                </button>
              </div>
              )}

            </div>

            {/* Footer with simulation & cancel */}
            <div className="flex items-center justify-between bg-[#05101E] border-t border-rose-500/15 px-6 py-4">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={match.status === 'completed'}
                className="text-xs font-sans font-black uppercase tracking-wider text-[#D4AF37] hover:text-[#D4AF37]/90 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" /> Auto-Fill Sets
              </button>

              <button
                type="button"
                onClick={onClose}
                className="bg-[#091A2E] hover:bg-[#0D2642] border border-rose-500/15 text-slate-300 hover:text-white font-sans font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
