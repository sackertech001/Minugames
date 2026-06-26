import React from 'react';
import { TournamentGroup, Player } from '../types';

interface StandingsTableProps {
  group: TournamentGroup;
  players: Player[];
  key?: string;
}

export default function StandingsTable({ group, players }: StandingsTableProps) {
  return (
    <div className="glass-panel p-4 rounded-xl overflow-hidden">
      <h3 className="text-lg font-bold text-white mb-4">{group.name}</h3>
      <table className="w-full text-left text-sm text-slate-400">
        <thead>
          <tr className="border-b border-[#2A2E37]">
            <th className="py-2 px-2">Team</th>
            <th className="py-2 px-2 text-center">P</th>
            <th className="py-2 px-2 text-center">W</th>
            <th className="py-2 px-2 text-center">D</th>
            <th className="py-2 px-2 text-center">L</th>
            <th className="py-2 px-2 text-center">GD</th>
            <th className="py-2 px-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2E37]/50">
          {group.standings.map((row) => {
            const player = players.find(p => p.id === row.teamId);
            return (
              <tr key={row.teamId} className="hover:bg-[#12151A]/60">
                <td className="py-3 px-2 text-white font-medium">{player?.name || 'Unknown'}</td>
                <td className="py-3 px-2 text-center">{row.played}</td>
                <td className="py-3 px-2 text-center">{row.won}</td>
                <td className="py-3 px-2 text-center">{row.drawn}</td>
                <td className="py-3 px-2 text-center">{row.lost}</td>
                <td className="py-3 px-2 text-center">{row.goalDifference}</td>
                <td className="py-3 px-2 text-center font-bold text-[#D4AF37]">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
