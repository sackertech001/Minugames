import React from 'react';
import { TournamentConfig, Player, Match } from '../types';
import { Trophy, Users, Calendar, Activity, CheckCircle, Clock } from 'lucide-react';

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Tournament Overview</h2>
        <div className="flex items-center gap-2 text-[#D4AF37] bg-[#D4AF37]/10 px-4 py-2 rounded-xl">
          <Trophy className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider">{tournamentConfig.tournamentName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Players" value={activePlayers.length.toString()} icon={Users} />
        <StatCard title="Total Matches" value={matches.length.toString()} icon={Activity} />
        <StatCard title="Completed Matches" value={completedMatches.length.toString()} icon={CheckCircle} />
        <StatCard title="Live Matches" value={liveMatches.length.toString()} icon={Clock} />
      </div>

      <div className="bg-[#12151A]/60 p-6 rounded-2xl border border-[#2A2E37]">
        <h3 className="text-xl font-bold text-white mb-4">Tournament Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
          <p><strong className="text-white">Venue:</strong> {tournamentConfig.venue}</p>
          <p><strong className="text-white">Format:</strong> {tournamentConfig.formatType === 'group' ? 'Group Stage' : 'Knockout'}</p>
          <p><strong className="text-white">Duration:</strong> {tournamentConfig.durationDays} Days</p>
          <p><strong className="text-white">Sets per Match:</strong> {tournamentConfig.setsToPlay}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-[#12151A]/60 p-6 rounded-2xl border border-[#2A2E37] flex items-center gap-4">
      <div className="p-3 bg-[#1A1D23] rounded-xl text-[#D4AF37]">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
