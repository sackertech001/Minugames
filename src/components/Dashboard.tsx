import React, { useState } from 'react';
import { TournamentConfig, Player, Match } from '../types';
import { Trophy, Users, Calendar, Activity, CheckCircle, Clock, Zap, Target, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';

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

  // Financial calculation: Estimate revenue from player registration fees
  const entryFee = 25; // e.g., $25 per player registration
  const calculatedRevenue = (players.length * entryFee);

  // Custom visual telemetry states
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  // Custom data points for the SVG interactive charts
  const performanceHistory = [
    { label: 'Day 1', matches: Math.round(matches.length * 0.3), players: Math.round(players.length * 0.8), rev: calculatedRevenue * 0.4 },
    { label: 'Day 2', matches: Math.round(matches.length * 0.7), players: players.length, rev: calculatedRevenue * 0.8 },
    { label: 'Day 3', matches: matches.length, players: players.length, rev: calculatedRevenue },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Premium Tournament Branding Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121F32] via-[#04142B] to-[#121F32] border border-[#1A2740] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#1A6DFF]/10 to-transparent rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-[#F1C317]/5 to-transparent rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-sans font-black text-[#1A6DFF] tracking-wider uppercase">Live Hub Dashboard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-[#EEF1F5] tracking-tight uppercase">
              {tournamentConfig.tournamentName}
            </h1>
            <p className="text-sm text-[#B2B6C2] max-w-2xl leading-relaxed">
              Welcome to the central esports administration system. Live score feeds, brackets tracking, registrations, and analytics are synced in real-time.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#121F32] border border-[#1A2740] p-4 rounded-2xl shadow-xl shrink-0">
            <div className="p-3 rounded-xl bg-[#F1C317]/10 border border-[#F1C317]/20 text-[#F1C317]">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-sans font-black text-[#B2B6C2] tracking-widest uppercase block leading-none">
                CHAMPIONSHIP ARENA
              </span>
              <span className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-wider mt-1 block">
                {tournamentConfig.venue || "Official Club Lounge"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Telemetry Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        <StatWidget 
          title="Total Tournaments" 
          value="5" 
          subtitle="4 Past • 1 Active"
          icon={Trophy} 
          accentColor="blue"
          onMouseEnter={() => setHoveredWidget('tournaments')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'tournaments'}
        />
        <StatWidget 
          title="Active Tournament" 
          value="1" 
          subtitle="Live & Scoring"
          icon={Activity} 
          accentColor="gold"
          onMouseEnter={() => setHoveredWidget('active')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'active'}
        />
        <StatWidget 
          title="Total Players" 
          value={players.length.toString()} 
          subtitle={`${activePlayers.length} Active • ${players.length - activePlayers.length} Pending`}
          icon={Users} 
          accentColor="blue"
          onMouseEnter={() => setHoveredWidget('players')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'players'}
        />
        <StatWidget 
          title="Completed Matches" 
          value={`${completedMatches.length}/${matches.length || 1}`} 
          subtitle={`${completionPercent}% Progress`}
          icon={CheckCircle} 
          accentColor="emerald"
          showProgress={true}
          progressValue={completionPercent}
          onMouseEnter={() => setHoveredWidget('completed')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'completed'}
        />
        <StatWidget 
          title="Live Matches" 
          value={liveMatches.length.toString()} 
          subtitle={liveMatches.length > 0 ? "⚠️ Scoring Feed Active" : "No Live Matches Now"}
          icon={Clock} 
          accentColor="red"
          isLive={liveMatches.length > 0}
          onMouseEnter={() => setHoveredWidget('live')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'live'}
        />
        <StatWidget 
          title="Revenue Generated" 
          value={`$${calculatedRevenue}`} 
          subtitle={`$${entryFee}/contender`}
          icon={DollarSign} 
          accentColor="emerald"
          onMouseEnter={() => setHoveredWidget('revenue')}
          onMouseLeave={() => setHoveredWidget(null)}
          isHovered={hoveredWidget === 'revenue'}
        />
      </div>

      {/* Visual Analytics & Setup Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive SVG Analytic Chart Widget */}
        <div className="lg:col-span-2 bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#1A6DFF]/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-[#1A2740] pb-4 mb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-black text-[#1A6DFF] tracking-wider uppercase flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Telemetry & Traffic Stream
              </span>
              <h3 className="text-lg font-display font-black text-[#EEF1F5] uppercase">
                Activity Progression
              </h3>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#B2B6C2]">
                <span className="w-2.5 h-2.5 bg-[#1A6DFF] rounded" /> Matches
              </span>
              <span className="flex items-center gap-1.5 text-[#B2B6C2]">
                <span className="w-2.5 h-2.5 bg-[#F1C317] rounded" /> Players
              </span>
            </div>
          </div>

          {/* SVG Custom Line & Bar Chart */}
          <div className="h-64 relative flex items-end justify-between px-4 pb-4">
            <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between pointer-events-none">
              {[0, 25, 50, 75, 100].reverse().map((gridVal, idx) => (
                <div key={idx} className="w-full flex items-center gap-2">
                  <span className="text-[9px] font-sans font-bold text-[#787E90] w-6 text-right">{gridVal}%</span>
                  <div className="flex-1 h-[1px] bg-[#1A2740]/40" />
                </div>
              ))}
            </div>

            {/* Chart Columns */}
            <div className="relative z-10 w-full h-48 flex items-end justify-around mt-8">
              {performanceHistory.map((pt, index) => {
                const matchHeight = Math.max(15, Math.round(((pt.matches / (matches.length || 10)) * 100)));
                const playerHeight = Math.round(((pt.players / (players.length || 10)) * 100));
                
                return (
                  <div key={index} className="flex flex-col items-center gap-3 w-24">
                    <div className="w-full flex items-end justify-center gap-3 h-36">
                      {/* Match bar */}
                      <div className="relative group/bar w-5 rounded-t-md bg-gradient-to-t from-[#0C48B8] to-[#1A6DFF] transition-all duration-500 hover:brightness-125" style={{ height: `${matchHeight}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A2740] border border-[#1A6DFF]/40 text-[#EEF1F5] text-[9px] font-sans font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          {pt.matches} Matches
                        </div>
                      </div>
                      {/* Player bar */}
                      <div className="relative group/bar w-5 rounded-t-md bg-gradient-to-t from-[#D4A30B] to-[#FFD43B] transition-all duration-500 hover:brightness-125" style={{ height: `${playerHeight}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A2740] border border-[#F1C317]/40 text-[#EEF1F5] text-[9px] font-sans font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          {pt.players} Players
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-sans font-black text-[#B2B6C2] uppercase tracking-wider">{pt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Technical Specification Widget */}
        <div className="bg-[#121F32] border border-[#1A2740] rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group">
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#F1C317]/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1A6DFF] shadow-[0_0_8px_rgba(26,109,255,0.8)]" />
              <h3 className="text-xs font-sans font-black text-[#EEF1F5] uppercase tracking-widest">
                Arena Rules & Specs
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#04142B] border border-[#1A2740] text-slate-300 rounded-xl">
                  <Target className="w-5 h-5 text-[#F1C317]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                    Host Arena Venue
                  </span>
                  <span className="text-sm font-sans font-black text-[#EEF1F5] uppercase tracking-wide mt-0.5 block">
                    {tournamentConfig.venue || "Class 46 Lounge"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#04142B] border border-[#1A2740] text-slate-300 rounded-xl">
                  <Trophy className="w-5 h-5 text-[#1A6DFF]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                    Competition Format
                  </span>
                  <span className="text-sm font-sans font-black text-[#EEF1F5] uppercase tracking-wide mt-0.5 block">
                    {tournamentConfig.formatType === 'group' ? 'Group Play + Knockout' : 'Pure Knockout Bracket'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-[#04142B] border border-[#1A2740] text-slate-300 rounded-xl">
                  <Zap className="w-5 h-5 text-[#F1C317]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-wider block">
                    Score Limit per Match
                  </span>
                  <span className="text-sm font-sans font-black text-[#EEF1F5] uppercase tracking-wide mt-0.5 block">
                    Best of {tournamentConfig.setsToPlay || "3"} Sets
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1A2740] flex items-center justify-between text-[10px] font-sans font-black uppercase tracking-wider">
            <span className="text-[#787E90]">Sync Feed Status</span>
            <span className="text-emerald-500 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              SECURE SYNCED
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}

interface StatWidgetProps {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  accentColor: 'blue' | 'gold' | 'emerald' | 'red';
  isLive?: boolean;
  showProgress?: boolean;
  progressValue?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHovered?: boolean;
}

function StatWidget({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  accentColor, 
  isLive, 
  showProgress, 
  progressValue,
  onMouseEnter,
  onMouseLeave,
  isHovered 
}: StatWidgetProps) {
  
  const accentClasses = {
    blue: {
      border: 'border-[#1A6DFF]/20 hover:border-[#1A6DFF]/40',
      shadow: 'hover:shadow-[#1A6DFF]/10',
      iconContainer: 'bg-[#1A6DFF]/10 text-[#1A6DFF] border border-[#1A6DFF]/20',
      textAccent: 'text-[#1A6DFF]',
      progressBg: 'bg-[#1A6DFF]'
    },
    gold: {
      border: 'border-[#F1C317]/20 hover:border-[#F1C317]/40',
      shadow: 'hover:shadow-[#F1C317]/10',
      iconContainer: 'bg-[#F1C317]/10 text-[#F1C317] border border-[#F1C317]/20',
      textAccent: 'text-[#F1C317]',
      progressBg: 'bg-[#F1C317]'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      shadow: 'hover:shadow-emerald-500/10',
      iconContainer: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      textAccent: 'text-emerald-400',
      progressBg: 'bg-emerald-500'
    },
    red: {
      border: 'border-[#EF4444]/20 hover:border-[#EF4444]/40',
      shadow: 'hover:shadow-[#EF4444]/10',
      iconContainer: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20',
      textAccent: 'text-[#EF4444]',
      progressBg: 'bg-[#EF4444]'
    }
  };

  const selectedAccent = accentClasses[accentColor];

  return (
    <div 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative overflow-hidden bg-[#121F32] p-5 rounded-2xl border ${selectedAccent.border} ${selectedAccent.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between group`}
    >
      {/* Decorative background glow on hover */}
      <div className={`absolute -inset-px bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl`} />

      {/* Live Badge indicator */}
      {isLive && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF4444]"></span>
        </span>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className={`p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${selectedAccent.iconContainer}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-sans font-black text-[#787E90] uppercase tracking-widest truncate">{title}</p>
          <p className="text-2xl font-display font-black text-[#EEF1F5] tracking-wide leading-none">{value}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#1A2740]/60 flex flex-col gap-2">
        <p className="text-[10px] font-sans text-[#B2B6C2] font-medium uppercase tracking-wider truncate">{subtitle}</p>
        
        {showProgress && progressValue !== undefined && (
          <div className="w-full h-1 bg-[#04142B] rounded-full overflow-hidden border border-[#1A2740]/40">
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
