import { Trophy, Calendar, MapPin, ShieldAlert, Award } from 'lucide-react';
import { TournamentConfig } from '../types';

interface TournamentInfoProps {
  config: TournamentConfig;
  onViewDay?: (day: number) => void;
}

export default function TournamentInfo({ config }: TournamentInfoProps) {
  // Determine matches count and schedule based on bracket size
  const totalMatches = config.playersCount || 32;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-300">
      {/* Column 1: Tournament Details Card */}
      <div className="bg-[#091A2E]/95 border border-rose-500/25 rounded-2xl p-6 shadow-[0_0_20px_rgba(225,29,72,0.1)] relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors duration-500 pointer-events-none"></div>
        <div className="flex items-center gap-3 border-b border-rose-500/10 pb-4 mb-4">
          <Trophy className="w-5 h-5 text-rose-500" />
          <h3 className="font-sans font-black text-sm text-white uppercase tracking-[0.2em]">Tournament Info</h3>
        </div>
        <div className="space-y-4 font-sans text-sm">
          <div className="flex justify-between items-center border-b border-[#1A1D24] pb-2">
            <span className="text-slate-400 font-medium">Format</span>
            <span className="text-rose-500 font-black tracking-wider uppercase">{config.format || "KNOCKOUT"}</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#1A1D24] pb-2">
            <span className="text-slate-400 font-medium">Players limit</span>
            <span className="text-slate-200 font-semibold">{config.playersCount || 32} Registered Slots</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#1A1D24] pb-2">
            <span className="text-slate-400 font-medium">Duration</span>
            <span className="text-slate-200 font-semibold">{config.durationDays || 3} Days</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#1A1D24] pb-2">
            <span className="text-slate-400 font-medium">Sets per Match</span>
            <span className="text-slate-200 font-semibold">Best of {config.setsToPlay || 3}</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#1A1D24] pb-2">
            <span className="text-slate-400 font-medium">Total Matches</span>
            <span className="text-slate-200 font-semibold">{totalMatches} Matches</span>
          </div>
          
          <div className="border-t border-rose-500/10 pt-4 mt-2 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                <MapPin className="w-4 h-4 text-rose-500" /> Venue
              </span>
              <span className="text-right text-rose-500 font-black tracking-wider uppercase">{config.venue || "CLASS 46 LOUNGE"}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                <Calendar className="w-4 h-4 text-rose-500" /> Dates
              </span>
              <span className="text-right text-slate-200 font-semibold">{config.dateRange || "17 July to 19 July 2026"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Prize Structure Card */}
      <div className="bg-[#091A2E]/95 border border-amber-500/25 rounded-2xl p-6 shadow-[0_0_20px_rgba(245,158,11,0.08)] relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500 pointer-events-none"></div>
        <div className="flex items-center gap-3 border-b border-amber-500/10 pb-4 mb-4">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-sans font-black text-sm text-amber-500 uppercase tracking-[0.2em]">Prize Structure</h3>
        </div>
        <div className="space-y-4">
          {/* 1st Place */}
          <div className="flex items-center gap-4 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl hover:bg-amber-500/10 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 flex items-center justify-center font-sans font-black text-black text-lg shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
              1
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">1st Place Champion</p>
              <p className="text-base font-black text-slate-100">{config.prizes.first || "₦350,000 + Certificate"}</p>
            </div>
          </div>

          {/* 2nd Place */}
          <div className="flex items-center gap-4 bg-slate-400/5 border border-slate-400/10 p-3 rounded-xl hover:bg-slate-400/10 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 flex items-center justify-center font-sans font-black text-black text-lg shadow-[0_0_10px_rgba(255,255,255,0.1)] shrink-0">
              2
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2nd Place Runner-Up</p>
              <p className="text-base font-black text-slate-100">{config.prizes.second || "₦150,000 + Certificate"}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex items-center gap-4 bg-amber-700/5 border border-amber-700/10 p-3 rounded-xl hover:bg-amber-700/10 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 flex items-center justify-center font-sans font-black text-black text-lg shadow-[0_0_10px_rgba(180,83,9,0.1)] shrink-0">
              3
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">3rd Place Finish</p>
              <p className="text-base font-black text-slate-100">{config.prizes.third || "Meal of Choice"}</p>
            </div>
          </div>

          {/* Highest Break */}
          <div className="flex items-center gap-4 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl hover:bg-rose-500/10 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 flex items-center justify-center font-sans font-bold text-white text-sm shadow-[0_0_10px_rgba(225,29,72,0.15)] shrink-0">
              ★
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Highest Break Bonus</p>
              <p className="text-base font-black text-slate-100">{config.prizes.highestBreak || "₦50,000"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Column 3: Rules & Notes Card */}
      <div className="bg-[#091A2E]/95 border border-rose-500/25 rounded-2xl p-6 shadow-[0_0_20px_rgba(225,29,72,0.1)] relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors duration-500 pointer-events-none"></div>
        <div className="flex items-center gap-3 border-b border-rose-500/10 pb-4 mb-4">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="font-sans font-black text-sm text-white uppercase tracking-[0.2em]">Official Guidelines</h3>
        </div>
        <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
          <div className="flex gap-2.5 items-start">
            <span className="text-rose-500 font-black text-base leading-none pt-0.5">•</span>
            <p>Use a single whatsapp number and email per player for registration.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-rose-500 font-black text-base leading-none pt-0.5">•</span>
            <p>Interested players should pay the sum of <span className="text-rose-500 font-extrabold">30,000 naira</span> to <span className="text-white font-semibold">CLASS 46 LIMITED</span> (ACC No: <span className="text-rose-400 font-mono">8233375637</span>, MONIEPOINT)</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-rose-500 font-black text-base leading-none pt-0.5">•</span>
            <p>Click <span className="text-rose-500 font-extrabold">Apply Now</span>, fill information and upload proof of payment as verification document.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-rose-500 font-black text-base leading-none pt-0.5">•</span>
            <p>Players must report to the tournament desk exactly <span className="text-rose-500 font-extrabold">15 minutes</span> before their scheduled match time.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="text-rose-500 font-black text-base leading-none pt-0.5">•</span>
            <p>The organizing committee's decision is final and absolute in all disputes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
