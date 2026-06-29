import React from 'react';
import { TournamentConfig, Player, Match } from '../types';
import { Trophy, Users, Calendar, Activity, CheckCircle, Clock, Zap, Target } from 'lucide-react';

interface DashboardProps {
  tournamentConfig: TournamentConfig;
  players: Player[];
  matches: Match[];
}

export default function Dashboard({ tournamentConfig, players, matches }: DashboardProps) {
  const activePlayers = players.filter(p => p.status === 'active');
  const completedMatches = matches.filter(m => m.status === 'completed');
  const liveMatches = matches.filter(m => m.status === 'playing');
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');

  // Calculate percentage of completion
  const totalMatchesCount = matches.length || 1;
  const completionPercent = Math.round((completedMatches.length / totalMatchesCount) * 100);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Title & Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-rose-500/10 pb-6">
        <div>
          <span className="text-[10px] font-sans font-black text-rose-500 tracking-[0.3em] uppercase block mb-1">
            Live Telemetry Hub
          </span>
          <h2 className="text-3xl md:text-4xl font-sans font-black text-white tracking-wider uppercase">
            Tournament Overview
          </h2>
        </div>
        <div className="flex items-center gap-3 bg-[#05101E] border border-rose-500/15 px-4 py-2.5 rounded-xl shadow-lg shadow-black/40 self-start md:self-auto">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-sans font-black text-[#D4AF37] tracking-widest uppercase block leading-none">
              Active Arena
            </span>
            <span className="text-xs font-sans font-black text-slate-100 uppercase tracking-wider mt-0.5 block">
              {tournamentConfig.tournamentName}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Contenders" 
          value={activePlayers.length.toString()} 
          subtitle="Ready for match action"
          icon={Users} 
          accentColor="rose"
        />
        <StatCard 
          title="Total Fixtures" 
          value={matches.length.toString()} 
          subtitle="Calculated in bracket"
          icon={Activity} 
          accentColor="gold"
        />
        <StatCard 
          title="Completed Matches" 
          value={`${completedMatches.length}/${matches.length}`} 
          subtitle={`${completionPercent}% Tournament Completion`}
          icon={CheckCircle} 
          accentColor="emerald"
          showProgress={true}
          progressValue={completionPercent}
        />
        <StatCard 
          title="Live Arena Matches" 
          value={liveMatches.length.toString()} 
          subtitle={liveMatches.length > 0 ? "⚠️ Broadcast active" : "No live matches now"}
          icon={Clock} 
          accentColor="rose"
          isLive={liveMatches.length > 0}
        />
      </div>

      {/* Interactive Arena Details Panel */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#091A2E] to-[#05101E] rounded-2xl border border-rose-500/15 p-6 md:p-8 shadow-2xl shadow-black/80">
        
        {/* Background Decorative Tech Grids */}
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none w-96 h-96 select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4AF37]">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 10 50 L 90 50 M 50 10 L 50 90" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative flex flex-col lg:flex-row gap-8 items-stretch justify-between">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="text-sm font-sans font-black text-rose-500 uppercase tracking-widest">
                Arena Specifications
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#05101E] border border-rose-500/10 text-slate-300 rounded-xl">
                  <Target className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">
                    Host Location / Venue
                  </span>
                  <span className="text-sm font-sans font-black text-slate-100 uppercase tracking-wide mt-0.5 block">
                    {tournamentConfig.venue || "Class 46 Lounge"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#05101E] border border-rose-500/10 text-slate-300 rounded-xl">
                  <Trophy className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">
                    Tournament Format
                  </span>
                  <span className="text-sm font-sans font-black text-slate-100 uppercase tracking-wide mt-0.5 block">
                    {tournamentConfig.formatType === 'group' ? 'Group Play + Knockout' : 'Pure Knockout Board'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#05101E] border border-rose-500/10 text-slate-300 rounded-xl">
                  <Calendar className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">
                    Event Duration Limit
                  </span>
                  <span className="text-sm font-sans font-black text-slate-100 uppercase tracking-wide mt-0.5 block">
                    {tournamentConfig.durationDays || "Active Scheduled"} Days
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#05101E] border border-rose-500/10 text-slate-300 rounded-xl">
                  <Zap className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider block">
                    Sets limit per Match
                  </span>
                  <span className="text-sm font-sans font-black text-slate-100 uppercase tracking-wide mt-0.5 block">
                    Best of {tournamentConfig.setsToPlay || "3"} Sets
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="lg:w-80 bg-[#05101E]/40 border border-rose-500/10 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shrink-0">
            <div>
              <span className="text-[9px] font-sans font-black text-[#D4AF37] uppercase tracking-widest block">
                Broadcasting Live Status
              </span>
              <h4 className="text-xs font-sans font-black text-slate-200 uppercase tracking-wider mt-1">
                MINU Telemetry Feed
              </h4>
              <p className="text-[10px] text-slate-400 font-sans mt-2.5 leading-relaxed">
                Matches advanced in brackets are fed instantly to the central displays. All registered scores are locked using cryptographical administrative validation.
              </p>
            </div>
            
            <div className="mt-5 pt-4 border-t border-rose-500/10 flex items-center justify-between text-[10px] font-sans font-black uppercase tracking-wider">
              <span className="text-slate-400">Telemetry Server</span>
              <span className="text-emerald-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  accentColor: 'rose' | 'gold' | 'emerald';
  isLive?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, accentColor, isLive, showProgress, progressValue }: StatCardProps) {
  const accentClasses = {
    rose: {
      border: 'border-rose-500/15 hover:border-rose-500/30',
      iconContainer: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      textAccent: 'text-rose-500',
      progressBg: 'bg-rose-500'
    },
    gold: {
      border: 'border-[#D4AF37]/15 hover:border-[#D4AF37]/35',
      iconContainer: 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20',
      textAccent: 'text-[#D4AF37]',
      progressBg: 'bg-[#D4AF37]'
    },
    emerald: {
      border: 'border-emerald-500/15 hover:border-emerald-500/30',
      iconContainer: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      textAccent: 'text-emerald-400',
      progressBg: 'bg-emerald-500'
    }
  };

  const selectedAccent = accentClasses[accentColor];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#091A2E] to-[#05101E] p-6 rounded-2xl border ${selectedAccent.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 group`}>
      
      {/* Decorative pulse element for active live state */}
      {isLive && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      )}

      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${selectedAccent.iconContainer}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-sans font-black text-white mt-0.5 tracking-wide leading-none">{value}</p>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-rose-500/5 flex flex-col gap-2">
        <p className="text-[10px] font-sans text-slate-400 font-medium uppercase tracking-wider truncate">{subtitle}</p>
        
        {showProgress && progressValue !== undefined && (
          <div className="w-full h-1.5 bg-[#05101E] rounded-full overflow-hidden border border-rose-500/5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${selectedAccent.progressBg}`}
              style={{ width: `${Math.max(4, Math.min(100, progressValue))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

