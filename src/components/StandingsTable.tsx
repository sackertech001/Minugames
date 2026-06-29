import React from 'react';
import { TournamentGroup, Player } from '../types';

interface StandingsTableProps {
  group: TournamentGroup;
  players: Player[];
  key?: string;
}

export default function StandingsTable({ group, players }: StandingsTableProps) {
  return (
    <div className="glass-panel p-6 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.03)]">
      <h3 className="text-sm font-sans font-black text-text-primary uppercase tracking-widest mb-4">{group.name} Standings</h3>
      <table className="w-full text-left text-xs text-text-secondary">
        <thead>
          <tr className="border-b border-rose-500/10 dark:border-[#2A2E37] text-[10px] font-sans font-black uppercase tracking-widest text-text-muted">
            <th className="py-2 px-2">Team</th>
            <th className="py-2 px-2 text-center">P</th>
            <th className="py-2 px-2 text-center">W</th>
            <th className="py-2 px-2 text-center">D</th>
            <th className="py-2 px-2 text-center">L</th>
            <th className="py-2 px-2 text-center">GD</th>
            <th className="py-2 px-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-500/10 dark:divide-[#2A2E37]/30 text-text-secondary">
          {group.standings.map((row) => {
            const player = players.find(p => p.id === row.teamId);
            return (
              <tr key={row.teamId} className="hover:bg-bg-primary/50 transition-colors">
                <td className="py-3 px-2 text-text-primary font-sans font-bold">{player?.name || 'Unknown'}</td>
                <td className="py-3 px-2 text-center">{row.played}</td>
                <td className="py-3 px-2 text-center">{row.won}</td>
                <td className="py-3 px-2 text-center">{row.drawn}</td>
                <td className="py-3 px-2 text-center">{row.lost}</td>
                <td className="py-3 px-2 text-center">{row.goalDifference}</td>
                <td className="py-3 px-2 text-center font-bold text-rose-500 dark:text-[#D4AF37]">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
