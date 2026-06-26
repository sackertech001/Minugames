import { Player, Match } from '../types';
import { generateSnookerAvatar } from './avatar';

export const DEMO_PLAYERS_RAW = [
  { name: 'Ronnie O\'Sullivan', nickname: 'The Rocket', club: 'Chigwell, UK' },
  { name: 'Judd Trump', nickname: 'The Ace in the Pack', club: 'Bristol, UK' },
  { name: 'Mark Selby', nickname: 'The Jester from Leicester', club: 'Leicester, UK' },
  { name: 'Mark Allen', nickname: 'The Pistol', club: 'Antrim, NI' },
  { name: 'Luca Brecel', nickname: 'The Belgian Bullet', club: 'Maasmechelen, BE' },
  { name: 'John Higgins', nickname: 'The Wizard of Wishaw', club: 'Wishaw, UK' },
  { name: 'Shaun Murphy', nickname: 'The Magician', club: 'Nottingham, UK' },
  { name: 'Kyren Wilson', nickname: 'The Warrior', club: 'Kettering, UK' },
  { name: 'Mark Williams', nickname: 'The Welsh Wonder', club: 'Cwm, UK' },
  { name: 'Ding Junhui', nickname: 'The Star of the East', club: 'Yixing, CN' },
  { name: 'Ali Carter', nickname: 'The Captain', club: 'Colchester, UK' },
  { name: 'Gary Wilson', nickname: 'The Tyneside Terror', club: 'Wallsend, UK' },
  { name: 'Zhang Anda', nickname: 'Mighty Mouse', club: 'Guangdong, CN' },
  { name: 'Tom Ford', nickname: 'The Silent Assassin', club: 'Glenfield, UK' },
  { name: 'Barry Hawkins', nickname: 'The Hawk', club: 'Ditton, UK' },
  { name: 'Robert Milkins', nickname: 'The Milkman', club: 'Gloucester, UK' },
  { name: 'Jack Lisowski', nickname: 'Jackpot', club: 'Cheltenham, UK' },
  { name: 'Hossein Vafaei', nickname: 'The Prince of Persia', club: 'Abadan, IR' },
  { name: 'Si Jiahui', nickname: 'The Chinese Sensation', club: 'Shaoxing, CN' },
  { name: 'Noppon Saengkham', nickname: 'The Thai Star', club: 'Samut Prakan, TH' },
  { name: 'Ryan Day', nickname: 'Dynamite', club: 'Pontycymmer, UK' },
  { name: 'Zhou Yuelong', nickname: 'The Chengdu Dragon', club: 'Chengdu, CN' },
  { name: 'Chris Wakelin', nickname: 'The Whistler', club: 'Rugby, UK' },
  { name: 'Stuart Bingham', nickname: 'Ballrun', club: 'Basildon, UK' },
  { name: 'Pang Junxu', nickname: 'The Golden Boy', club: 'Anhui, CN' },
  { name: 'Stephen Maguire', nickname: 'On Fire', club: 'Glasgow, UK' },
  { name: 'Matthew Selt', nickname: 'The Fighter', club: 'Romford, UK' },
  { name: 'Joe O\'Connor', nickname: 'The Kid', club: 'Leicester, UK' },
  { name: 'David Gilbert', nickname: 'The Angry Farmer', club: 'Derby, UK' },
  { name: 'Ricky Walden', nickname: 'The Walnut', club: 'Chester, UK' },
  { name: 'Robbie Williams', nickname: 'The Entertainer', club: 'Wirral, UK' },
  { name: 'Yuan Sijun', nickname: 'The Speedster', club: 'Nanchang, CN' },
];

export function getDemoPlayers(): Player[] {
  return DEMO_PLAYERS_RAW.map((p, idx) => {
    const seed = idx + 1;
    return {
      id: `p-${seed}`,
      name: p.name,
      nickname: p.nickname,
      club: p.club,
      seed,
      photoUrl: generateSnookerAvatar(p.name, seed),
      matchesPlayed: 0,
      matchesWon: 0,
      totalPoints: 0,
      highestBreak: 0,
      status: 'active',
    };
  });
}

export function createInitialMatches(players: Player[], playersCount: number = 32): Match[] {
  const matches: Match[] = [];

  // 1. Create Round of 32 (16 Matches: M1 to M16) - Day 1
  // Only generated if we have 32 players
  if (playersCount === 32) {
    for (let i = 0; i < 16; i++) {
      const p1 = players[i * 2] || null;
      const p2 = players[i * 2 + 1] || null;
      const mNum = i + 1;

      // Estimate a schedule time on Day 1
      const hour = 9 + Math.floor(i / 2) * 2; // e.g., 9:00, 11:00, 13:00, 15:00...
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;

      matches.push({
        id: `M${mNum}`,
        label: `Match ${mNum}`,
        round: 'R32',
        day: 1,
        player1Id: p1 ? p1.id : null,
        player2Id: p2 ? p2.id : null,
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
        scheduledTime: `Day 1 - ${timeStr}`,
      });
    }
  }

  // 2. Create Round of 16 (8 Matches: R16-1 to R16-8) - Day 2
  // Generated if playersCount is 16 or 32. If playersCount is 16, we populate players directly.
  if (playersCount >= 16) {
    for (let i = 0; i < 8; i++) {
      const r16Num = i + 1;
      const hour = 10 + Math.floor(i / 2) * 2.5;
      const timeStr = `${Math.floor(hour)}:${(hour % 1 === 0) ? '00' : '30'}`;

      const p1 = playersCount === 16 ? (players[i * 2] || null) : null;
      const p2 = playersCount === 16 ? (players[i * 2 + 1] || null) : null;

      matches.push({
        id: `R16-${r16Num}`,
        label: `R16 Match ${r16Num}`,
        round: 'R16',
        day: 2,
        player1Id: p1 ? p1.id : null,
        player2Id: p2 ? p2.id : null,
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
        scheduledTime: `Day 2 - ${timeStr}`,
      });
    }
  }

  // 3. Create Quarter Finals (4 Matches: QF-1 to QF-4) - Day 2
  // If playersCount is 8, we populate players directly in QF.
  for (let i = 0; i < 4; i++) {
    const qfNum = i + 1;
    const hour = 15 + i * 2;
    const timeStr = `${hour}:00`;

    const p1 = playersCount === 8 ? (players[i * 2] || null) : null;
    const p2 = playersCount === 8 ? (players[i * 2 + 1] || null) : null;

    matches.push({
      id: `QF-${qfNum}`,
      label: `QF Match ${qfNum}`,
      round: 'QF',
      day: 2,
      player1Id: p1 ? p1.id : null,
      player2Id: p2 ? p2.id : null,
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
      scheduledTime: `Day 2 - ${timeStr}`,
    });
  }

  // 4. Create Semi Finals (2 Matches: SF-1 & SF-2) - Day 3
  matches.push({
    id: 'SF-1',
    label: 'SF Match 1',
    round: 'SF',
    day: 3,
    player1Id: null,
    player2Id: null,
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
    scheduledTime: 'Day 3 - 10:00',
  });

  matches.push({
    id: 'SF-2',
    label: 'SF Match 2',
    round: 'SF',
    day: 3,
    player1Id: null,
    player2Id: null,
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
    scheduledTime: 'Day 3 - 12:30',
  });

  // 5. Create 3rd Place Match (1 Match: 3RD-1) - Day 3
  matches.push({
    id: '3RD-1',
    label: '3rd Place Match',
    round: '3RD',
    day: 3,
    player1Id: null,
    player2Id: null,
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
    scheduledTime: 'Day 3 - 15:30',
  });

  // 6. Create Final (1 Match: FINAL) - Day 3
  matches.push({
    id: 'FINAL',
    label: 'Grand Final',
    round: 'F',
    day: 3,
    player1Id: null,
    player2Id: null,
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
    scheduledTime: 'Day 3 - 19:00',
  });

  return matches;
}

/**
 * Propagates results when a match is completed.
 * Returns the updated list of matches.
 */
export function propagateWinner(
  matches: Match[],
  matchId: string,
  winnerId: string,
  loserId: string
): Match[] {
  const updatedMatches = [...matches];

  // Logic to find which match the winner advances to
  if (matchId.startsWith('M')) {
    // Round of 32 (M1 - M16)
    const mNum = parseInt(matchId.replace('M', ''), 10);
    const nextR16Num = Math.floor((mNum - 1) / 2) + 1;
    const isPlayer1 = mNum % 2 !== 0;

    const targetMatch = updatedMatches.find((m) => m.id === `R16-${nextR16Num}`);
    if (targetMatch) {
      if (isPlayer1) {
        targetMatch.player1Id = winnerId;
      } else {
        targetMatch.player2Id = winnerId;
      }
    }
  } else if (matchId.startsWith('R16-')) {
    // Round of 16 (R16-1 - R16-8)
    const rNum = parseInt(matchId.replace('R16-', ''), 10);
    const nextQFNum = Math.floor((rNum - 1) / 2) + 1;
    const isPlayer1 = rNum % 2 !== 0;

    const targetMatch = updatedMatches.find((m) => m.id === `QF-${nextQFNum}`);
    if (targetMatch) {
      if (isPlayer1) {
        targetMatch.player1Id = winnerId;
      } else {
        targetMatch.player2Id = winnerId;
      }
    }
  } else if (matchId.startsWith('QF-')) {
    // Quarter Finals (QF-1 - QF-4)
    const qNum = parseInt(matchId.replace('QF-', ''), 10);
    const nextSFNum = Math.floor((qNum - 1) / 2) + 1;
    const isPlayer1 = qNum % 2 !== 0;

    const targetMatch = updatedMatches.find((m) => m.id === `SF-${nextSFNum}`);
    if (targetMatch) {
      if (isPlayer1) {
        targetMatch.player1Id = winnerId;
      } else {
        targetMatch.player2Id = winnerId;
      }
    }
  } else if (matchId === 'SF-1') {
    // Semi-Final 1
    // Winner -> Final (P1)
    const finalMatch = updatedMatches.find((m) => m.id === 'FINAL');
    if (finalMatch) finalMatch.player1Id = winnerId;

    // Loser -> 3rd Place Match (P1)
    const thirdMatch = updatedMatches.find((m) => m.id === '3RD-1');
    if (thirdMatch) thirdMatch.player1Id = loserId;
  } else if (matchId === 'SF-2') {
    // Semi-Final 2
    // Winner -> Final (P2)
    const finalMatch = updatedMatches.find((m) => m.id === 'FINAL');
    if (finalMatch) finalMatch.player2Id = winnerId;

    // Loser -> 3rd Place Match (P2)
    const thirdMatch = updatedMatches.find((m) => m.id === '3RD-1');
    if (thirdMatch) thirdMatch.player2Id = loserId;
  }

  return updatedMatches;
}
