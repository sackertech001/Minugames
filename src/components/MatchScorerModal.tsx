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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0F1115]/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A2E37] px-6 py-4 bg-slate-50 dark:bg-[#12151A] transition-colors">
          <div>
            <span className="text-[10px] font-bold font-mono bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2 py-1 rounded-md uppercase tracking-wider">
              {match.round === 'R32' && 'Round of 32'}
              {match.round === 'R16' && 'Round of 16'}
              {match.round === 'QF' && 'Quarter Finals'}
              {match.round === 'SF' && 'Semi Finals'}
              {match.round === '3RD' && '3rd Place Match'}
              {match.round === 'F' && 'Grand Final'}
            </span>
            <h3 className="font-serif font-bold text-base text-slate-800 dark:text-[#E0E2E6] mt-1 uppercase tracking-wide">
              {match.label} <span className="text-slate-400 dark:text-[#6B7280] text-xs font-normal">({match.scheduledTime})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-[#6B7280] hover:text-slate-800 hover:dark:text-[#E0E2E6] hover:bg-slate-200 dark:hover:bg-[#12151A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isReady ? (
          <div className="p-8 text-center bg-white dark:bg-[#1A1D23]">
            <AlertTriangle className="w-12 h-12 text-[#D4AF37]/80 mx-auto mb-4 animate-bounce" />
            <p className="text-slate-800 dark:text-[#E0E2E6] font-bold text-sm">Awaiting Prior Matches</p>
            <p className="text-slate-500 dark:text-[#9CA3AF] text-xs mt-1.5 max-w-sm mx-auto">
              This match is scheduled, but the participating players haven't advanced from the previous rounds yet. Complete previous matches to fill this slot!
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-[#12151A] dark:hover:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Back to Brackets
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1D23] overflow-y-auto max-h-[80vh]">
            <div className="p-6 space-y-6">
              
              {/* Scoreboard Summary Display */}
              <div className="bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-4 flex items-center justify-between transition-colors">
                {/* Player 1 summary */}
                <div className="flex flex-col items-center text-center w-5/12">
                  <img
                    src={p1.photoUrl}
                    alt={p1.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#2A2E37] shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#E0E2E6] mt-2 truncate w-full">{p1.name}</h4>
                </div>

                {/* Score VS Circle */}
                <div className="flex flex-col items-center justify-center w-2/12">
                  <div className="text-[9px] font-bold text-slate-400 dark:text-[#6B7280] font-mono tracking-wider uppercase mb-1">VS</div>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#12151A] border border-slate-200 dark:border-[#2A2E37] px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-[#D4AF37]">
                    <span>{calculatedP1SetsWon}</span>
                    <span className="opacity-40">-</span>
                    <span>{calculatedP2SetsWon}</span>
                  </div>
                </div>

                {/* Player 2 summary */}
                <div className="flex flex-col items-center text-center w-5/12">
                  <img
                    src={p2.photoUrl}
                    alt={p2.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#2A2E37] shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#E0E2E6] mt-2 truncate w-full">{p2.name}</h4>
                </div>
              </div>

              {/* Start Match Prompt Banner if scheduled */}
              {match.status === 'scheduled' && (
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold font-mono text-[#D4AF37] uppercase tracking-wider block">Match Status: Scheduled</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-[#E0E2E6]">Ready to commence this matchup?</h4>
                    <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF]">
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
                    className="bg-[#D4AF37] hover:bg-[#b8952d] text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" /> Start Match Now
                  </button>
                </div>
              )}

              {/* Number of Games/Sets Configuration */}
              <div className="bg-slate-50 dark:bg-[#12151A]/60 border border-slate-200 dark:border-[#2A2E37] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[#D4AF37]" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 dark:text-[#E0E2E6] uppercase tracking-wide">Match Set Configuration</h5>
                    <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Determine how many sets are played in this match</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                </div>
              </div>

              {/* Individual Sets/Periods Inputs */}
              <div className="space-y-3.5">
                <h5 className="text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider font-serif border-b border-slate-200 dark:border-[#2A2E37] pb-1">
                  {formatType === 'group' ? 'Log Points per Period' : 'Log Points per Set'}
                </h5>
                <div className="grid grid-cols-1 gap-3.5 max-h-[250px] overflow-y-auto pr-1">
                  {formatType === 'group' ? (
                    <>
                      {['firstHalf', 'secondHalf', 'extraTime', 'penalties'].map((period) => (
                        <div key={period} className="bg-slate-50 dark:bg-[#12151A]/60 border border-slate-200 dark:border-[#2A2E37] p-3 rounded-xl flex items-center justify-between gap-4">
                          <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#6B7280] w-20 capitalize">{period.replace(/([A-Z])/g, ' $1')}</span>
                          <div className="flex items-center gap-2">
                             <input type="number" disabled={match.status === 'completed'} value={soccerScores[period as keyof SoccerScore]?.player1Points || ''} onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               const updated = {...soccerScores, [period]: {...soccerScores[period as keyof SoccerScore], player1Points: val}};
                               setSoccerScores(updated);
                               triggerLiveUpdate(null, updated);
                             }} className="w-16 text-center font-bold text-xs rounded-lg py-1 border"/>
                             <span className="font-bold text-xs">:</span>
                             <input type="number" disabled={match.status === 'completed'} value={soccerScores[period as keyof SoccerScore]?.player2Points || ''} onChange={(e) => {
                               const val = Math.max(0, parseInt(e.target.value) || 0);
                               const updated = {...soccerScores, [period]: {...soccerScores[period as keyof SoccerScore], player2Points: val}};
                               setSoccerScores(updated);
                               triggerLiveUpdate(null, updated);
                             }} className="w-16 text-center font-bold text-xs rounded-lg py-1 border"/>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    setScores.map((score, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-[#12151A]/60 border border-slate-200 dark:border-[#2A2E37] p-3 rounded-xl flex items-center justify-between gap-4">
                          <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#6B7280] w-12">Set {idx + 1}</span>
                          <div className="flex items-center justify-end gap-3 flex-1">
                             <div className="flex items-center gap-2">
                               <input type="number" disabled={match.status === 'completed'} value={score.player1Points || ''} onChange={(e) => {
                                 const val = Math.max(0, parseInt(e.target.value) || 0);
                                 const next = [...setScores];
                                 next[idx] = { ...next[idx], player1Points: val };
                                 setSetScores(next);
                                 triggerLiveUpdate(next);
                               }} className="w-16 text-center font-bold text-xs rounded-lg py-1 border"/>
                             </div>
                             <span className="font-bold text-xs">:</span>
                             <div className="flex items-center gap-2">
                               <input type="number" disabled={match.status === 'completed'} value={score.player2Points || ''} onChange={(e) => {
                                 const val = Math.max(0, parseInt(e.target.value) || 0);
                                 const next = [...setScores];
                                 next[idx] = { ...next[idx], player2Points: val };
                                 setSetScores(next);
                                 triggerLiveUpdate(next);
                               }} className="w-16 text-center font-bold text-xs rounded-lg py-1 border"/>
                             </div>
                          </div>
                        </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action: click button to declare winner and move them to the next round */}
              {match.status !== 'completed' && (
                <div className="border-t border-slate-200 dark:border-[#2A2E37] pt-5 space-y-3.5">
                  <div className="text-center">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-[#E0E2E6] uppercase tracking-wide">
                      DECLARE MATCH WINNER & ADVANCE
                    </h5>
                    <p className="text-[10px] text-slate-400 dark:text-[#6B7280] mt-0.5">
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
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/15'
                        : 'bg-white dark:bg-[#1A1D23] border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] hover:border-[#D4AF37]'
                    }`}
                  >
                    <Trophy className="w-5 h-5 shrink-0" />
                    <div className="font-bold text-xs uppercase truncate w-full">
                      Declare {p1.name.split(' ')[0]} Winner
                    </div>
                    {calculatedP1SetsWon > calculatedP2SetsWon && (
                      <span className="text-[8px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded tracking-wider">
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
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/15'
                        : 'bg-white dark:bg-[#1A1D23] border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] hover:border-[#D4AF37]'
                    }`}
                  >
                    <Trophy className="w-5 h-5 shrink-0" />
                    <div className="font-bold text-xs uppercase truncate w-full">
                      Declare {p2.name.split(' ')[0]} Winner
                    </div>
                    {calculatedP2SetsWon > calculatedP1SetsWon && (
                      <span className="text-[8px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded tracking-wider">
                        Recommended
                      </span>
                    )}
                  </button>
                </div>

                {/* Button for Draw */}
                <button
                    type="button"
                    onClick={() => handleDeclareWinner('draw')}
                    className="w-full mt-4 p-3 rounded-xl border border-slate-200 dark:border-[#2A2E37] bg-white dark:bg-[#1A1D23] text-slate-700 dark:text-[#E0E2E6] hover:border-[#D4AF37] text-center flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Trophy className="w-4 h-4 shrink-0" />
                    <div className="font-bold text-xs uppercase">
                      Declare Draw
                    </div>
                </button>
              </div>
              )}

            </div>

            {/* Footer with simulation & cancel */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-[#12151A] border-t border-slate-200 dark:border-[#2A2E37] px-6 py-4 transition-colors">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={match.status === 'completed'}
                className="text-xs font-bold text-[#D4AF37] hover:text-[#D4AF37]/90 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" /> Auto-Fill Sets
              </button>

              <button
                type="button"
                onClick={onClose}
                className="bg-white hover:bg-slate-100 dark:bg-[#1A1D23] dark:hover:bg-[#12151A] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
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
