import { Player, TournamentGroup, StandingsRow, Match } from '../types';

export const generateGroups = (players: Player[], numberOfGroups: number): TournamentGroup[] => {
  const groups: TournamentGroup[] = [];
  const playersPerGroup = Math.ceil(players.length / numberOfGroups);

  for (let i = 0; i < numberOfGroups; i++) {
    const groupPlayers = players.slice(i * playersPerGroup, (i + 1) * playersPerGroup);
    
    const group: TournamentGroup = {
      id: `group-${String.fromCharCode(65 + i)}`,
      name: `Group ${String.fromCharCode(65 + i)}`,
      teams: groupPlayers.map(p => p.id),
      standings: groupPlayers.map(p => ({
        teamId: p.id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      }))
    };
    groups.push(group);
  }
  return groups;
};

export const generateGroupFixtures = (groups: TournamentGroup[]): Match[] => {
  const matches: Match[] = [];
  groups.forEach(group => {
    const teams = group.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `match-${group.id}-${teams[i]}-${teams[j]}`,
          label: `Group Match`,
          round: 'GroupStage',
          matchDate: '',
          player1Id: teams[i],
          player2Id: teams[j],
          score1: null,
          score2: null,
          points1: null,
          points2: null,
          break1: null,
          break2: null,
          frames: [],
          winnerId: null,
          loserId: null,
          status: 'scheduled',
          groupId: group.id
        });
      }
    }
  });
  return matches;
};

export const updateStandings = (group: TournamentGroup, matches: Match[], pointsConfig: { winPoints: number, drawPoints: number, lossPoints: number }): TournamentGroup => {
  const updatedStandings: StandingsRow[] = group.teams.map(teamId => {
    const teamMatches = matches.filter(m => {
      const matchInGroup = m.groupId === group.id;
      const teamInMatch = m.player1Id === teamId || m.player2Id === teamId;
      const isCompleted = m.status === 'completed';
      if (matchInGroup && teamInMatch) {
        console.log(`DEBUG: Match ${m.id} in Group ${group.id}: ${matchInGroup}, Team ${teamId} in Match: ${teamInMatch}, Completed: ${isCompleted}`);
      }
      return matchInGroup && teamInMatch && isCompleted;
    });
    
    console.log(`DEBUG: Team ${teamId} matches found: ${teamMatches.length}`);
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    teamMatches.forEach(match => {
      const isPlayer1 = match.player1Id === teamId;
      const scoreFor = isPlayer1 ? match.score1 : match.score2;
      const scoreAgainst = isPlayer1 ? match.score2 : match.score1;
      
      console.log('DEBUG: Match', match.id, 'Team', teamId, 'scoreFor', scoreFor, 'scoreAgainst', scoreAgainst, 'winnerId', match.winnerId, 'MatchStatus', match.status);

      if (scoreFor !== null && scoreAgainst !== null) {
        goalsFor += scoreFor;
        goalsAgainst += scoreAgainst;
      }

      if (match.winnerId === teamId) {
        won++;
      } else if (match.winnerId === 'draw') {
        drawn++;
      } else {
        lost++;
      }
    });

    const points = (won * pointsConfig.winPoints) + (drawn * pointsConfig.drawPoints) + (lost * pointsConfig.lossPoints);
    console.log('Team', teamId, 'stats: W', won, 'D', drawn, 'L', lost, 'Pts', points, 'GoalsFor', goalsFor, 'GoalsAgainst', goalsAgainst);

    return {
      teamId,
      played: teamMatches.length,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points
    };
  });

  return {
    ...group,
    standings: updatedStandings
  };
};
