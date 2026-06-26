import { Trophy, Calendar, MapPin, ShieldAlert, Award, AlignLeft } from 'lucide-react';
import { TournamentConfig } from '../types';

interface TournamentInfoProps {
  config: TournamentConfig;
  onViewDay?: (day: number) => void;
}

export default function TournamentInfo({ config, onViewDay }: TournamentInfoProps) {
  // Determine matches count and schedule based on bracket size
  const totalMatches = config.playersCount; // 8, 16, or 32

  const getDayDate = (day: number) => {
    const startDate = new Date(config.dateRange.split(' to ')[0]);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (day - 1));
    return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
      {/* Tournament Details Card */}
      <div className="stadium-panel rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/10 transition-colors duration-500"></div>
        <div className="flex items-center gap-3 border-b border-slate-200/20 dark:border-[#2A2E37] pb-4 mb-4">
          <Trophy className="w-6 h-6 text-[#D4AF37]" />
          <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#E0E2E6] uppercase tracking-wider">Tournament Info</h3>
        </div>
        <div className="space-y-4 font-sans text-sm">
          <div className="flex justify-between items-center border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium">Format</span>
            <span className="text-[#D4AF37] font-bold uppercase tracking-wider">{config.format}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium">Players limit</span>
            <span className="text-slate-800 dark:text-[#E0E2E6] font-semibold">{config.playersCount} Registered Slots</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium">Duration</span>
            <span className="text-slate-800 dark:text-[#E0E2E6] font-semibold">{config.durationDays} Days</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium">Sets per Match</span>
            <span className="text-slate-800 dark:text-[#E0E2E6] font-semibold">Best of {config.setsToPlay}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium">Total Matches</span>
            <span className="text-slate-800 dark:text-[#E0E2E6] font-semibold">{totalMatches} Matches</span>
          </div>
          <div className="flex justify-between items-start border-b border-slate-100/20 dark:border-[#2A2E37]/50 pb-2 pt-1 gap-4">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium flex items-center gap-1.5 shrink-0">
              <MapPin className="w-4 h-4 text-[#D4AF37]/70" /> Venue
            </span>
            <span className="text-right text-[#D4AF37] font-bold uppercase tracking-wide">{config.venue}</span>
          </div>
          <div className="flex justify-between items-start pt-1 gap-4">
            <span className="text-slate-600 dark:text-[#9CA3AF] font-medium flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-[#D4AF37]/70" /> Dates
            </span>
            <span className="text-right text-slate-800 dark:text-[#E0E2E6] font-semibold">{config.dateRange}</span>
          </div>
        </div>
      </div>

      {/* Prize Structure Card */}
      <div className="stadium-panel rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-550/5 rounded-full blur-2xl group-hover:bg-emerald-550/10 transition-colors duration-500"></div>
        <div className="flex items-center gap-3 border-b border-slate-200/20 dark:border-[#2A2E37] pb-4 mb-4">
          <Award className="w-6 h-6 text-[#D4AF37]" />
          <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#E0E2E6] uppercase tracking-wider">Prize Structure</h3>
        </div>
        <div className="space-y-4">
          {/* 1st Place */}
          <div className="flex items-center gap-4 bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/60 flex items-center justify-center font-bold text-[#0F1115] shadow-md shrink-0">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">1st Place Champion</p>
              <p className="text-base font-bold text-slate-800 dark:text-[#E0E2E6]">{config.prizes.first}</p>
            </div>
          </div>

          {/* 2nd Place */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#12151A] border border-slate-200 dark:border-[#2A2E37] p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center font-bold text-[#0F1115] shadow-md shrink-0">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">2nd Place Runner-Up</p>
              <p className="text-base font-semibold text-slate-800 dark:text-[#E0E2E6]">{config.prizes.second}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex items-center gap-4 bg-[#D4AF37]/5 border border-slate-200/60 dark:border-[#2A2E37]/60 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/80 to-[#D4AF37]/40 flex items-center justify-center font-bold text-[#0F1115] shadow-md shrink-0">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">3rd Place Finish</p>
              <p className="text-base font-medium text-slate-600 dark:text-[#9CA3AF]">{config.prizes.third}</p>
            </div>
          </div>

          {/* Highest Break */}
          {config.prizes.highestBreak && (
            <div className="flex items-center gap-4 bg-purple-500/5 border border-purple-500/15 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shrink-0 text-xs">
                ★
              </div>
              <div>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Highest Break Bonus</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-[#E0E2E6]">{config.prizes.highestBreak}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules & Notes Card */}
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#2A2E37] pb-4 mb-4">
          <ShieldAlert className="w-6 h-6 text-slate-500 dark:text-[#9CA3AF]" />
          <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#E0E2E6] uppercase tracking-wider">Official Guidelines</h3>
        </div>
        <div className="space-y-3 font-sans text-xs text-slate-600 dark:text-[#9CA3AF]">
          <div className="flex gap-2.5 items-start">
            <span className="text-[#D4AF37] font-bold text-sm leading-none pt-0.5">•</span>
            <p>All matches are strictly knockout (single elimination).</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-[#D4AF37] font-bold text-sm leading-none pt-0.5">•</span>
            <p>Players must report to the tournament desk exactly <span className="text-[#D4AF37] font-semibold">15 minutes</span> before their scheduled match time.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-[#D4AF37] font-bold text-sm leading-none pt-0.5">•</span>
            <p>The organizing committee's decision is final and absolute in all disputes.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-[#D4AF37] font-bold text-sm leading-none pt-0.5">•</span>
            <p>Good sportsmanship is mandatory. Foul play or misconduct results in immediate disqualification.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-[#D4AF37] font-bold text-sm leading-none pt-0.5">•</span>
            <p>Matches are completed based on the default sets count (best of {config.setsToPlay}) configured for this championship series.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
