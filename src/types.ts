export interface Player {
  id: string;
  name: string;
  nickname?: string;
  club?: string;
  seed: number;
  photoUrl: string; // Base64 Data URL or public image URL
  matchesPlayed: number;
  matchesWon: number;
  totalPoints: number; // Cumulative points scored across matches
  highestBreak: number; // Highest break in the tournament
  status: 'active' | 'eliminated' | 'champion' | 'runner_up' | 'third_place' | 'fourth_place';
  tournamentType?: string;
}

export interface FrameScore {
  player1Points: number;
  player2Points: number;
}

export interface SoccerScore {
  firstHalf: FrameScore;
  secondHalf: FrameScore;
  extraTime?: FrameScore;
  penalties?: FrameScore;
}

export interface Match {
  id: string; // e.g. "M1", "R16-1", "QF-1", "SF-1", "F-1", "3RD-1"
  label: string; // e.g. "Match 1", "R16 Match 1", "QF-1", etc.
  round: 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F' | 'GroupStage';
  matchDate?: string;
  player1Id: string | null;
  player2Id: string | null;
  score1: number | null; // Total goals/frames won
  score2: number | null; // Total goals/frames won
  points1: number | null; // Total match points gained
  points2: number | null; // Total match points gained
  break1: number | null; // Highest break in this match by P1
  break2: number | null; // Highest break in this match by P2
  frames: FrameScore[]; // Frame by frame details (optional, for realism)
  soccerScore?: SoccerScore; // Detailed soccer-style scores
  startTime?: number; // Match start timestamp
  endTime?: number; // Match end timestamp
  winnerId: string | null;
  loserId: string | null;
  status: 'scheduled' | 'playing' | 'completed';
  scheduledTime?: string;
  groupId?: string; // Add this
  day?: number;
}

export interface StandingsRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TournamentGroup {
  id: string;
  name: string;
  teams: string[];
  standings: StandingsRow[];
}

export interface TournamentConfig {
  tournamentName: string;
  format: string;
  playersCount: number; // 8, 16, or 32
  durationDays: number;
  formatType: 'knockout' | 'group';
  groups?: TournamentGroup[];
  numberOfGroups?: number;
  teamsPerGroup?: number;
  matchesPerTeamInGroup?: number;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  registrationToken: string;
  publicPortalToken: string;
  venue: string;
  dateRange: string;
  setsToPlay: number; // e.g. 3, 5, 7, 9
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  tournamentTypes?: string[];
  selectedTournamentType?: string;
}

export interface SystemUser {
  id: string;
  username: string;
  role: string; // Dynamic role matching RolePermission
  pin: string; // 4-digit pin
}

export interface RolePermission {
  role: string;
  allowedTabs: string[]; // e.g. 'info', 'registration', 'bracket', 'display', 'settings'
  allowedActions: string[]; // e.g. 'scoreMatches', 'userManagement', 'editSettings', 'quickSimulate', 'wipeSystem'
}

export interface PlayerApplication {
  id: string;
  fullName: string;
  email?: string;
  nickname?: string;
  photoUrl: string;
  club?: string;
  phoneNumber: string;
  whatsappNumber?: string;
  socialMediaPage?: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  documentUrl?: string; // Base64 representation of PDF/PNG/JPEG document
  documentName?: string; // Name of the uploaded file
  tournamentType?: string;
}


