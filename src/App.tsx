import { useState, useEffect } from 'react';
import { Player, Match, FrameScore, TournamentConfig, SystemUser, RolePermission, PlayerApplication, SoccerScore } from './types';
import {
  createInitialMatches,
  propagateWinner,
  getDemoPlayers,
} from './utils/demoData';
import { generateGroups, generateGroupFixtures, updateStandings } from './utils/groupGenerator';
import {
  Trophy,
  Users,
  GitFork,
  Tv,
  Info,
  Calendar,
  Sparkles,
  RefreshCw,
  Award,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import InvalidRegistrationPage from './components/InvalidRegistrationPage';
import TournamentLandingPage from './components/TournamentLandingPage';
import RegistrationPortal from './components/RegistrationPortal';
import Dashboard from './components/Dashboard';
import GroupStageView from './components/GroupStageView';
import TournamentBracket from './components/TournamentBracket';
import LiveDisplayScreen from './components/LiveDisplayScreen';
import TournamentInfo from './components/TournamentInfo';
import MatchScorerModal from './components/MatchScorerModal';
import ConfirmModal from './components/ConfirmModal';
import SettingsTab from './components/SettingsTab';
import LoginPage from './components/LoginPage';
import PlayerApplicationForm from './components/PlayerApplicationForm';
import { getSupabase } from './utils/supabaseClient';
import Sidebar from './components/Sidebar';

// Memory fallback storage for sandboxed environments where localStorage is blocked
const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem is blocked, using memory fallback:', e);
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage.setItem is blocked, using memory fallback:', e);
      memoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage.removeItem is blocked, using memory fallback:', e);
      delete memoryStorage[key];
    }
  }
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracketView, setBracketView] = useState<'full' | 'day1' | 'day2' | 'day3'>('full');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bracket' | 'display' | 'registration' | 'info' | 'settings'>('dashboard');
  const [isTournamentStarted, setIsTournamentStarted] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = safeStorage.getItem('cue_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Dynamic tournament specification settings
  const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig>({
    tournamentName: 'CLASS 46 SNOOKER CHAMPIONSHIP',
    format: 'Knockout',
    playersCount: 32,
    durationDays: 3,
    formatType: 'knockout',
    groups: [],
    registrationToken: 'a1b2c3d4e5f6',
    publicPortalToken: 'p1q2r3s4t5u6',
    venue: 'Class 46 Lounge',
    dateRange: '17 July to 19 July 2026',
    setsToPlay: 3,
    prizes: {
      first: '₦350,000 + Certificate',
      second: '₦150,000 + Certificate',
      third: 'Meal of Choice',
      highestBreak: '₦50,000',
    }
  });

  // Role-Based Access Control users state with rich defaults
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([
    { id: 'u-admin', username: 'admin', role: 'Admin', pin: '1234' },
    { id: 'u-owner', username: 'owner', role: 'Owner', pin: '5555' },
    { id: 'u-gameadmin', username: 'game_admin', role: 'Game Admin', pin: '7777' },
    { id: 'u-referee', username: 'referee', role: 'Referee', pin: '2222' },
    { id: 'u-scorer', username: 'scorer', role: 'Scorer', pin: '3333' },
    { id: 'u-player', username: 'player', role: 'Player', pin: '4444' }
  ]);

  // Dynamic role permissions matrix configuration state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([
    {
      role: 'Admin',
      allowedTabs: ['dashboard', 'info', 'registration', 'bracket', 'display', 'settings'],
      allowedActions: ['scoreMatches', 'userManagement', 'editSettings', 'quickSimulate', 'wipeSystem']
    },
    {
      role: 'Owner',
      allowedTabs: ['dashboard', 'info', 'registration', 'bracket', 'display', 'settings'],
      allowedActions: ['scoreMatches', 'editSettings', 'quickSimulate', 'wipeSystem'] // Note: All but User Management
    },
    {
      role: 'Game Admin',
      allowedTabs: ['dashboard', 'registration', 'bracket', 'display'],
      allowedActions: ['scoreMatches', 'editSettings']
    },
    {
      role: 'Referee',
      allowedTabs: ['dashboard', 'bracket', 'display'],
      allowedActions: ['scoreMatches']
    },
    {
      role: 'Scorer',
      allowedTabs: ['dashboard', 'bracket', 'display'],
      allowedActions: ['scoreMatches']
    },
    {
      role: 'Player',
      allowedTabs: ['dashboard', 'info', 'bracket', 'display'],
      allowedActions: []
    }
  ]);

  // Current authenticated user (session-based)
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);

  // Player applications state
  const [playerApplications, setPlayerApplications] = useState<PlayerApplication[]>([]);
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] = useState(true);
  const [isApplyMode, setIsApplyMode] = useState(false);
  const [isLandingPageMode, setIsLandingPageMode] = useState(false);
  const [isPublicViewMode, setIsPublicViewMode] = useState(false);
  const [isInvalidLinkMode, setIsInvalidLinkMode] = useState(false);
  const [isPortalLinkInvalid, setIsPortalLinkInvalid] = useState(false);

  const [systemLogo, setSystemLogo] = useState<string>('');

  const handleUpdateSystemLogo = (newLogo: string) => {
    setSystemLogo(newLogo);
    safeStorage.setItem('snooker_system_logo', newLogo);
    saveStateToServer({ systemLogo: newLogo });
  };

  const saveStateToServer = async (patch: any) => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
    } catch (e) {
      console.warn('Could not sync state to server:', e);
    }
  };

  // Parse URL for Public Registration Form Mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    // If not yet initialized, just return
    if (!tournamentConfig.registrationToken) return;

    if (params.get('apply') === 'true') {
      console.log('Comparing tokens:', urlToken, tournamentConfig.registrationToken);
      if (urlToken === tournamentConfig.registrationToken) {
        setIsLandingPageMode(true);
        setIsInvalidLinkMode(false);
      } else {
        setIsLandingPageMode(false);
        setIsApplyMode(false);
        setIsInvalidLinkMode(true);
        showToast('Registration link is invalid or expired.', 'error');
      }
    } else if (params.get('public') === 'true') {
      if (urlToken === tournamentConfig.publicPortalToken) {
        setIsPublicViewMode(true);
        setIsInvalidLinkMode(false);
        setIsPortalLinkInvalid(false);
      } else {
        setIsInvalidLinkMode(true);
        setIsPortalLinkInvalid(true);
        showToast('Public link is invalid or expired.', 'error');
      }
    }
  }, [tournamentConfig.registrationToken, tournamentConfig.publicPortalToken]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Theme Syncing Effect
  useEffect(() => {
    safeStorage.setItem('cue_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // 1. LocalStorage hydration
  useEffect(() => {
    try {
      const savedPlayers = safeStorage.getItem('snooker_players');
      const savedMatches = safeStorage.getItem('snooker_matches');
      const savedStarted = safeStorage.getItem('snooker_started');
      const savedConfig = safeStorage.getItem('snooker_config');
      const savedUsers = safeStorage.getItem('snooker_users');
      const savedPermissions = safeStorage.getItem('snooker_role_permissions');
      const savedCurrentUser = safeStorage.getItem('snooker_current_user');
      const savedApplications = safeStorage.getItem('snooker_player_applications');
      const savedLogo = safeStorage.getItem('snooker_system_logo');

      if (savedPlayers) {
        setPlayers(JSON.parse(savedPlayers));
      }
      if (savedMatches) {
        setMatches(JSON.parse(savedMatches));
      }
      if (savedStarted) {
        setIsTournamentStarted(JSON.parse(savedStarted));
      }
      if (savedConfig) {
        setTournamentConfig(JSON.parse(savedConfig));
      }
      if (savedUsers) {
        setSystemUsers(JSON.parse(savedUsers));
      }
      if (savedPermissions) {
        const parsedPermissions = JSON.parse(savedPermissions);
        // Ensure dashboard is included, especially for Admin
        parsedPermissions.forEach((p: any) => {
          if (!p.allowedTabs.includes('dashboard')) {
            p.allowedTabs.push('dashboard');
          }
        });
        setRolePermissions(parsedPermissions);
        safeStorage.setItem('snooker_role_permissions', JSON.stringify(parsedPermissions));
      }
      if (savedCurrentUser) {
        setCurrentUser(JSON.parse(savedCurrentUser));
      }
      if (savedApplications) {
        setPlayerApplications(JSON.parse(savedApplications));
      }
      if (savedLogo) {
        setSystemLogo(savedLogo);
      }
    } catch (e) {
      console.error('Failed to parse state from storage:', e);
    }
  }, []);

  // Listen for storage changes and periodically poll the API/localStorage to guarantee real-time synchronization
  // in sandboxed iframe environments or sibling tabs where standard StorageEvent might not propagate.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'snooker_player_applications') {
          if (e.newValue) {
            setPlayerApplications(JSON.parse(e.newValue));
          } else {
            setPlayerApplications([]);
          }
        } else if (e.key === 'snooker_players') {
          if (e.newValue) {
            setPlayers(JSON.parse(e.newValue));
          }
        } else if (e.key === 'snooker_matches') {
          if (e.newValue) {
            setMatches(JSON.parse(e.newValue));
          }
        } else if (e.key === 'snooker_started') {
          if (e.newValue) {
            setIsTournamentStarted(JSON.parse(e.newValue));
          }
        } else if (e.key === 'snooker_config') {
          if (e.newValue) {
            setTournamentConfig(JSON.parse(e.newValue));
          }
        } else if (e.key === 'snooker_public_registration_enabled') {
          if (e.newValue) {
            setPublicRegistrationEnabled(e.newValue === 'true');
          }
        }
      } catch (err) {
        console.error('Failed to parse synchronized state from other tab:', err);
      }
    };

    const pollSync = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          
          setPlayers((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.players)) {
              safeStorage.setItem('snooker_players', JSON.stringify(data.players));
              return data.players;
            }
            return prev;
          });

          setMatches((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.matches)) {
              safeStorage.setItem('snooker_matches', JSON.stringify(data.matches));
              return data.matches;
            }
            return prev;
          });

          setIsTournamentStarted((prev) => {
            if (prev !== data.isTournamentStarted) {
              safeStorage.setItem('snooker_started', JSON.stringify(data.isTournamentStarted));
              return data.isTournamentStarted;
            }
            return prev;
          });

          setTournamentConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.tournamentConfig)) {
              safeStorage.setItem('snooker_config', JSON.stringify(data.tournamentConfig));
              return data.tournamentConfig;
            }
            return prev;
          });

          setSystemUsers((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.systemUsers)) {
              safeStorage.setItem('snooker_users', JSON.stringify(data.systemUsers));
              return data.systemUsers;
            }
            return prev;
          });

          setRolePermissions((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.rolePermissions)) {
              safeStorage.setItem('snooker_role_permissions', JSON.stringify(data.rolePermissions));
              return data.rolePermissions;
            }
            return prev;
          });

          setPlayerApplications((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.playerApplications)) {
              safeStorage.setItem('snooker_player_applications', JSON.stringify(data.playerApplications));
              return data.playerApplications;
            }
            return prev;
          });

          setPublicRegistrationEnabled((prev) => {
            if (prev !== data.publicRegistrationEnabled) {
              safeStorage.setItem('snooker_public_registration_enabled', String(data.publicRegistrationEnabled));
              return data.publicRegistrationEnabled;
            }
            return prev;
          });

          setSystemLogo((prev) => {
            if (prev !== data.systemLogo) {
              safeStorage.setItem('snooker_system_logo', data.systemLogo || '');
              return data.systemLogo || '';
            }
            return prev;
          });

          return;
        }
      } catch (err) {
        console.warn('API sync unavailable, falling back to local storage sync:', err);
      }

      // Local storage fallback sync
      try {
        const savedApps = safeStorage.getItem('snooker_player_applications');
        if (savedApps) {
          const parsed = JSON.parse(savedApps);
          setPlayerApplications((prev) => {
            if (JSON.stringify(prev) !== savedApps) {
              return parsed;
            }
            return prev;
          });
        } else {
          setPlayerApplications((prev) => {
            if (prev.length > 0) return [];
            return prev;
          });
        }

        const savedPlayers = safeStorage.getItem('snooker_players');
        if (savedPlayers) {
          const parsed = JSON.parse(savedPlayers);
          setPlayers((prev) => {
            if (JSON.stringify(prev) !== savedPlayers) {
              return parsed;
            }
            return prev;
          });
        }

        const savedMatches = safeStorage.getItem('snooker_matches');
        if (savedMatches) {
          const parsed = JSON.parse(savedMatches);
          setMatches((prev) => {
            if (JSON.stringify(prev) !== savedMatches) {
              return parsed;
            }
            return prev;
          });
        }

        const savedIsStarted = safeStorage.getItem('snooker_started');
        if (savedIsStarted) {
          const parsed = JSON.parse(savedIsStarted);
          setIsTournamentStarted((prev) => {
            if (prev !== parsed) {
              return parsed;
            }
            return prev;
          });
        }

        const savedConfig = safeStorage.getItem('snooker_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setTournamentConfig((prev) => {
            if (JSON.stringify(prev) !== savedConfig) {
              return parsed;
            }
            return prev;
          });
        }

        const savedReg = safeStorage.getItem('snooker_public_registration_enabled');
        if (savedReg) {
          setPublicRegistrationEnabled(savedReg === 'true');
        }

        const savedLogo = safeStorage.getItem('snooker_system_logo');
        if (savedLogo) {
          setSystemLogo((prev) => {
            if (prev !== savedLogo) {
              return savedLogo;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error polling sync from localStorage:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Perform initial synchronization immediately
    pollSync();
    
    // Poll storage and API every 1500ms for robust state synchronization
    const interval = setInterval(pollSync, 1500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Save to LocalStorage helper
  const saveStateToStorage = (
    newPlayers: Player[],
    newMatches: Match[],
    started: boolean
  ) => {
    safeStorage.setItem('snooker_players', JSON.stringify(newPlayers));
    safeStorage.setItem('snooker_matches', JSON.stringify(newMatches));
    safeStorage.setItem('snooker_started', JSON.stringify(started));
    saveStateToServer({ players: newPlayers, matches: newMatches, isTournamentStarted: started });
  };

  // RBAC Action handlers
  const handleUpdateConfig = (newConfig: TournamentConfig) => {
    setTournamentConfig(newConfig);
    safeStorage.setItem('snooker_config', JSON.stringify(newConfig));
    saveStateToServer({ tournamentConfig: newConfig });
  };

  const handleUpdateUsers = (newUsers: SystemUser[]) => {
    setSystemUsers(newUsers);
    safeStorage.setItem('snooker_users', JSON.stringify(newUsers));
    saveStateToServer({ systemUsers: newUsers });
  };

  const handleUpdateRolePermissions = (newPermissions: RolePermission[]) => {
    setRolePermissions(newPermissions);
    safeStorage.setItem('snooker_role_permissions', JSON.stringify(newPermissions));
    saveStateToServer({ rolePermissions: newPermissions });
  };

  const hasPermission = (action: string) => {
    if (!currentUser) return false;
    const userPerm = rolePermissions.find(rp => rp.role === currentUser.role);
    return userPerm?.allowedActions.includes(action) || false;
  };

  const isTabAllowed = (tabId: string) => {
    if (!currentUser) return false;
    if (tabId === 'dashboard') return true; // Always allow dashboard
    const userPerm = rolePermissions.find(rp => rp.role === currentUser.role);
    return userPerm?.allowedTabs.includes(tabId) || false;
  };

  const handleLogin = (user: SystemUser | null) => {
    setCurrentUser(user);
    if (user) {
      safeStorage.setItem('snooker_current_user', JSON.stringify(user));
      const userPerm = rolePermissions.find(rp => rp.role === user.role);
      if (userPerm && userPerm.allowedTabs.length > 0) {
        // Auto navigate to the first allowed tab
        setActiveTab(userPerm.allowedTabs[0]);
      }
    } else {
      safeStorage.removeItem('snooker_current_user');
    }
  };

  // 2. Start Championship Action
  const handleStartTournament = () => {
    if (players.length !== tournamentConfig.playersCount) {
      showToast(`Please register exactly ${tournamentConfig.playersCount} players to commence!`, 'error');
      return;
    }

    // Create the scheduled matches list depending on configured playersCount
    let matchesToSet: Match[] = [];
    if (tournamentConfig.formatType === 'group' && tournamentConfig.groups) {
      matchesToSet = generateGroupFixtures(tournamentConfig.groups);
    } else {
      matchesToSet = createInitialMatches(players, tournamentConfig.playersCount);
    }
    
    setMatches(matchesToSet);
    setIsTournamentStarted(true);
    setActiveTab('bracket');

    saveStateToStorage(players, matchesToSet, true);
  };

  // 3. Score Saving & Result Propagation
  const handleSaveScore = (
    matchId: string,
    score1: number,
    score2: number,
    points1: number,
    points2: number,
    break1: number,
    break2: number,
    frames: FrameScore[],
    winnerId: string,
    loserId: string,
    soccerScore?: SoccerScore
  ) => {
    // A. Update match properties
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          score1,
          score2,
          points1,
          points2,
          break1: null,
          break2: null,
          frames,
          soccerScore,
          winnerId,
          loserId,
          status: 'completed' as const,
          endTime: Date.now(),
        };
      }
      return m;
    });

    // B. Propagate winner to next bracket slot (skip for draws)
    let finalMatches = updatedMatches;
    if (winnerId !== 'draw') {
        finalMatches = propagateWinner(updatedMatches, matchId, winnerId, loserId);
    }

    // If it's a group match, update the groups standings
    const completedMatch = updatedMatches.find(m => m.id === matchId);
    if (completedMatch?.groupId && tournamentConfig.formatType === 'group') {
      const groupIndex = tournamentConfig.groups?.findIndex(g => g.id === completedMatch.groupId);
      if (groupIndex !== undefined && groupIndex !== -1 && tournamentConfig.groups) {
        const group = tournamentConfig.groups[groupIndex];
        const updatedGroup = updateStandings(group, updatedMatches, {
            winPoints: tournamentConfig.winPoints || 3,
            drawPoints: tournamentConfig.drawPoints || 1,
            lossPoints: tournamentConfig.lossPoints || 0
        });
        const updatedGroups = [...tournamentConfig.groups];
        updatedGroups[groupIndex] = updatedGroup;
        const newConfig = { ...tournamentConfig, groups: updatedGroups };
        setTournamentConfig(newConfig);
        safeStorage.setItem('snooker_config', JSON.stringify(newConfig));
        saveStateToServer({ tournamentConfig: newConfig });
      }
    }

    // C. Update Player tournament stats & status
    const updatedPlayers = players.map((p) => {
      let matchesPlayed = p.matchesPlayed;
      let matchesWon = p.matchesWon;
      let totalPoints = p.totalPoints;
      let status = p.status;

      // If this player was in the match
      if (p.id === (completedMatch?.player1Id) || p.id === (completedMatch?.player2Id)) {
        matchesPlayed += 1;
        
        if (winnerId !== 'draw') {
            if (p.id === winnerId) {
              matchesWon += 1;
            }
        }

        // Add the actual points scored by this player in this match
        const originalMatch = matches.find((m) => m.id === matchId);
        if (originalMatch) {
          if (p.id === originalMatch.player1Id) {
            totalPoints += points1;
          } else if (p.id === originalMatch.player2Id) {
            totalPoints += points2;
          }
        }
        
        if (winnerId === 'draw') {
            totalPoints += (tournamentConfig.drawPoints || 1);
        }

        // Status update logic (skip if draw)
        if (winnerId !== 'draw') {
            // Discard loser unless they go to 3rd place match
            if (p.id === loserId) {
              if (matchId === 'SF-1' || matchId === 'SF-2') {
                // Goes to 3rd place match, so stays active
                status = 'active';
              } else if (matchId === 'FINAL') {
                status = 'runner_up';
              } else if (matchId === '3RD-1') {
                status = 'fourth_place';
              } else {
                status = 'eliminated';
              }
            } else {
              // Winner statuses
              if (matchId === 'FINAL') {
                status = 'champion';
              } else if (matchId === '3RD-1') {
                status = 'third_place';
              }
            }
        }
      }

      return {
        ...p,
        matchesPlayed,
        matchesWon,
        totalPoints,
        status,
      };
    });

    setPlayers(updatedPlayers);
    setMatches(finalMatches);
    saveStateToStorage(updatedPlayers, finalMatches, isTournamentStarted);
  };

  // Start a scheduled match to streaming live state
  const handleStartMatch = (matchId: string) => {
    if (!currentUser || !hasPermission('scoreMatches')) {
      showToast('Your current role does not have authorization to start matches.', 'error');
      setActiveTab('settings');
      return;
    }

    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          status: 'playing' as const,
          startTime: Date.now(),
        };
      }
      return m;
    });

    setMatches(updatedMatches);
    saveStateToStorage(players, updatedMatches, isTournamentStarted);
    showToast(`Match ${matchId} has started and is streaming live on the Display Board!`, 'success');
  };

  // Push real-time, point-by-point frame score updates to the live dashboard
  const handleUpdateLiveScore = (
    matchId: string,
    frames: FrameScore[],
    score1: number,
    score2: number,
    points1: number,
    points2: number,
    soccerScore?: SoccerScore
  ) => {
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          frames,
          score1,
          score2,
          points1,
          points2,
          soccerScore,
        };
      }
      return m;
    });

    setMatches(updatedMatches);
    saveStateToStorage(players, updatedMatches, isTournamentStarted);
  };

  // 4. Quick Simulate Tournament Option (Amazing for testers!)
  const handleAutoSimulateAllReady = () => {
    if (!hasPermission('quickSimulate')) {
      showToast('Your current role does not have authorization to auto-simulate matches.', 'error');
      setActiveTab('settings');
      return;
    }
    if (!isTournamentStarted) return;

    // Find all matches that can be played (have player1 and player2) but are not yet completed
    const playableMatches = matches.filter(
      (m) => m.player1Id && m.player2Id && (m.status === 'scheduled' || m.status === 'playing')
    );

    if (playableMatches.length === 0) {
      // Check if tournament is completely finished
      const finalMatch = matches.find((m) => m.id === 'FINAL');
      if (finalMatch && finalMatch.status === 'completed') {
        showToast('Tournament has already concluded! We have a champion.', 'info');
      } else {
        showToast('Complete previous rounds to unlock the next matches!', 'info');
      }
      return;
    }

    // Copy states to execute sequential propagation
    let tempMatches = [...matches];
    let tempPlayers = [...players];

    playableMatches.forEach((matchToSimulate) => {
      const matchId = matchToSimulate.id;
      if (!matchToSimulate.player1Id || !matchToSimulate.player2Id) return;

      const p1Wins = Math.random() > 0.5;
      
      // Simulate 3 sets
      const simulatedFrames: FrameScore[] = [
        {
          player1Points: p1Wins ? 55 : 30,
          player2Points: p1Wins ? 30 : 55,
        },
        {
          player1Points: Math.random() > 0.5 ? 60 : 25,
          player2Points: Math.random() > 0.5 ? 25 : 60,
        },
        {
          player1Points: p1Wins ? 50 : 35,
          player2Points: p1Wins ? 35 : 50,
        }
      ];

      // Tally sets won
      const score1 = simulatedFrames.reduce((sum, f) => sum + (f.player1Points > f.player2Points ? 1 : 0), 0);
      const score2 = simulatedFrames.reduce((sum, f) => sum + (f.player2Points > f.player1Points ? 1 : 0), 0);

      // Tally total points
      const points1 = simulatedFrames.reduce((sum, f) => sum + f.player1Points, 0);
      const points2 = simulatedFrames.reduce((sum, f) => sum + f.player2Points, 0);

      const winnerId = score1 > score2 ? matchToSimulate.player1Id : matchToSimulate.player2Id;
      const loserId = score1 > score2 ? matchToSimulate.player2Id : matchToSimulate.player1Id;

      // Apply modifications
      tempMatches = tempMatches.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            score1,
            score2,
            points1,
            points2,
            break1: null,
            break2: null,
            frames: simulatedFrames,
            winnerId,
            loserId,
            status: 'completed' as const,
          };
        }
        return m;
      });

      // Propagate winner
      tempMatches = propagateWinner(tempMatches, matchId, winnerId, loserId);

      // Update player stats
      tempPlayers = tempPlayers.map((p) => {
        let matchesPlayed = p.matchesPlayed;
        let matchesWon = p.matchesWon;
        let totalPoints = p.totalPoints;
        let status = p.status;

        if (p.id === winnerId || p.id === loserId) {
          matchesPlayed += 1;
          if (p.id === winnerId) matchesWon += 1;

          // Add the simulated points scored by this player in this match
          if (p.id === matchToSimulate.player1Id) {
            totalPoints += points1;
          } else if (p.id === matchToSimulate.player2Id) {
            totalPoints += points2;
          }

          if (p.id === loserId) {
            if (matchId === 'SF-1' || matchId === 'SF-2') {
              status = 'active';
            } else if (matchId === 'FINAL') {
              status = 'runner_up';
            } else if (matchId === '3RD-1') {
              status = 'fourth_place';
            } else {
              status = 'eliminated';
            }
          } else {
            if (matchId === 'FINAL') {
              status = 'champion';
            } else if (matchId === '3RD-1') {
              status = 'third_place';
            }
          }
        }

        return {
          ...p,
          matchesPlayed,
          matchesWon,
          totalPoints,
          status,
        };
      });
    });

    setPlayers(tempPlayers);
    setMatches(tempMatches);
    saveStateToStorage(tempPlayers, tempMatches, isTournamentStarted);
  };

  // 5. Complete Reset Option
  const handleResetEntireTournament = () => {
    if (!hasPermission('wipeSystem')) {
      showToast('Your current role does not have authorization to wipe the tournament system data.', 'error');
      // If not logged in, auto navigate to settings so they can log in
      setActiveTab('settings');
      return;
    }
    setShowWipeConfirm(true);
  };

  const handleConfirmWipe = () => {
    setPlayers([]);
    setMatches([]);
    setIsTournamentStarted(false);
    setActiveTab('info');
    
    // Clear and reset tournament config & users back to default
    const defaultConfig: TournamentConfig = {
      tournamentName: 'CLASS 46 SNOOKER CHAMPIONSHIP',
      format: 'Knockout',
      playersCount: 32,
      durationDays: 3,
      formatType: 'knockout',
      registrationToken: 'a1b2c3d4e5f6',
      publicPortalToken: 'p1q2r3s4t5u6',
      venue: 'Class 46 Lounge',
      dateRange: '17 July to 19 July 2026',
      setsToPlay: 3,
      prizes: {
        first: '₦350,000 + Certificate',
        second: '₦150,000 + Certificate',
        third: 'Meal of Choice',
        highestBreak: '₦50,000',
      }
    };
    setTournamentConfig(defaultConfig);
    
    const defaultUsers: SystemUser[] = [
      { id: 'u-admin', username: 'admin', role: 'Admin', pin: '1234' },
      { id: 'u-owner', username: 'owner', role: 'Owner', pin: '5555' },
      { id: 'u-gameadmin', username: 'game_admin', role: 'Game Admin', pin: '7777' },
      { id: 'u-referee', username: 'referee', role: 'Referee', pin: '2222' },
      { id: 'u-scorer', username: 'scorer', role: 'Scorer', pin: '3333' },
      { id: 'u-player', username: 'player', role: 'Player', pin: '4444' }
    ];
    setSystemUsers(defaultUsers);

    const defaultPermissions: RolePermission[] = [
      {
        role: 'Admin',
        allowedTabs: ['info', 'registration', 'bracket', 'display', 'settings'],
        allowedActions: ['scoreMatches', 'userManagement', 'editSettings', 'quickSimulate', 'wipeSystem']
      },
      {
        role: 'Owner',
        allowedTabs: ['info', 'registration', 'bracket', 'display', 'settings'],
        allowedActions: ['scoreMatches', 'editSettings', 'quickSimulate', 'wipeSystem']
      },
      {
        role: 'Game Admin',
        allowedTabs: ['registration', 'bracket', 'display'],
        allowedActions: ['scoreMatches', 'editSettings']
      },
      {
        role: 'Referee',
        allowedTabs: ['bracket', 'display'],
        allowedActions: ['scoreMatches']
      },
      {
        role: 'Scorer',
        allowedTabs: ['bracket', 'display'],
        allowedActions: ['scoreMatches']
      },
      {
        role: 'Player',
        allowedTabs: ['info', 'bracket', 'display'],
        allowedActions: []
      }
    ];
    setRolePermissions(defaultPermissions);
    setCurrentUser(null);
    setPlayerApplications([]);

    safeStorage.removeItem('snooker_players');
    safeStorage.removeItem('snooker_matches');
    safeStorage.removeItem('snooker_started');
    safeStorage.removeItem('snooker_config');
    safeStorage.removeItem('snooker_users');
    safeStorage.removeItem('snooker_role_permissions');
    safeStorage.removeItem('snooker_current_user');
    safeStorage.removeItem('snooker_player_applications');

    saveStateToServer({
      players: [],
      matches: [],
      isTournamentStarted: false,
      tournamentConfig: defaultConfig,
      systemUsers: defaultUsers,
      rolePermissions: defaultPermissions,
      playerApplications: [],
      publicRegistrationEnabled: true
    });

    setShowWipeConfirm(false);
    showToast('All system configurations, match histories, and roles have been wiped.', 'success');
  };

  const handlePlayersChange = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
    saveStateToStorage(newPlayers, matches, isTournamentStarted);
  };

  const handleApplicationsChange = (newApps: PlayerApplication[]) => {
    setPlayerApplications(newApps);
    safeStorage.setItem('snooker_player_applications', JSON.stringify(newApps));
    saveStateToServer({ playerApplications: newApps });
  };

  const handleSelectMatch = (id: string) => {
    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Referee' && currentUser.role !== 'Scorer')) {
      showToast('Please sign in as Admin, Referee, or Scorer in the System Settings tab to score matches.', 'error');
      setActiveTab('settings');
      return;
    }
    setSelectedMatchId(id);
  };

  // Find champion
  const champion = players.find((p) => p.status === 'champion');

  if (isInvalidLinkMode) {
    return <InvalidRegistrationPage isPortalLink={isPortalLinkInvalid} />;
  }

  if (isPublicViewMode) {
    return (
      <TournamentLandingPage
        config={tournamentConfig}
        players={players}
        matches={matches}
        showApplyButton={false}
        onApply={() => {
          setIsPublicViewMode(false);
          setIsApplyMode(true);
        }}
      />
    );
  }

  if (isLandingPageMode) {
    return (
      <TournamentLandingPage
        config={tournamentConfig}
        players={players}
        matches={matches}
        hideTabs={true}
        onApply={() => {
          setIsLandingPageMode(false);
          setIsApplyMode(true);
        }}
      />
    );
  }

  if (isApplyMode) {
    if (!publicRegistrationEnabled) {
      return (
        <div className="min-h-screen bg-[#0F1115] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1A1D23] border border-red-500/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif font-bold text-xl uppercase tracking-wider">Registration Closed</h2>
              <p className="text-xs text-slate-400">
                The public player registration portal for <span className="text-[#D4AF37] font-semibold">{tournamentConfig.tournamentName}</span> is currently closed or has concluded.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  window.location.search = '';
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs py-3 rounded-xl transition-all border border-slate-700 cursor-pointer"
              >
                Go to Tournament Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleSubmitApplication = async (app: Omit<PlayerApplication, 'id' | 'status' | 'appliedAt'>) => {
      // If Supabase client is configured, register the player to Supabase Auth to trigger profiles population
      const supabase = getSupabase();
      if (supabase) {
        try {
          const userEmail = app.email || `player-${Date.now()}@example.com`;
          // We use a safe password structure for registration
          const userPassword = `PlayerPass123_Secure!`;
          const { data, error } = await supabase.auth.signUp({
            email: userEmail,
            password: userPassword,
            options: {
              data: {
                full_name: app.fullName,
                nickname: app.nickname,
                club: app.club,
                phone_number: app.phoneNumber,
                whatsapp_number: app.whatsappNumber,
                social_media_page: app.socialMediaPage,
                photo_url: app.photoUrl,
                document_url: app.documentUrl,
                document_name: app.documentName,
              }
            }
          });
          if (error) {
            console.error('Supabase signup trigger error:', error.message);
          } else {
            console.log('Successfully synchronized application to Supabase Auth:', data.user);
          }
        } catch (supabaseErr) {
          console.error('Unexpected Supabase error during player registration:', supabaseErr);
        }
      }

      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        });
        if (res.ok) {
          // Trigger instant page refresh/sync
          try {
            const syncRes = await fetch('/api/state');
            if (syncRes.ok) {
              const data = await syncRes.json();
              setPlayerApplications(data.playerApplications);
            }
          } catch (err) {}
          return;
        }
      } catch (e) {
        console.error('Failed to submit application to server, using local fallback:', e);
      }

      // Fallback
      const newApp: PlayerApplication = {
        ...app,
        id: `app-${Date.now()}`,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };
      
      let currentApps: PlayerApplication[] = [];
      try {
        const savedApps = safeStorage.getItem('snooker_player_applications');
        if (savedApps) {
          currentApps = JSON.parse(savedApps);
        }
      } catch (e) {
        console.error('Failed to parse current applications from storage:', e);
      }
      
      const updated = [...currentApps, newApp];
      handleApplicationsChange(updated);
    };

    return (
      <PlayerApplicationForm
        tournamentName={tournamentConfig.tournamentName}
        onSubmitApplication={handleSubmitApplication}
        systemLogo={systemLogo}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        users={systemUsers}
        onLogin={handleLogin}
        tournamentConfig={tournamentConfig}
        theme={theme}
        setTheme={setTheme}
        systemLogo={systemLogo}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-primary text-text-primary">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isTabAllowed={isTabAllowed} />
      
      <div className="flex-1 ml-72">
        {/* Premium Luxury Header Bar */}
        <header className="bg-white/95 dark:bg-[#15181F]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2A2E37] py-6 px-4 md:px-8 sticky top-0 z-30 shadow-sm dark:shadow-lg dark:shadow-black/40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-4">
            {systemLogo ? (
              <img
                src={systemLogo}
                alt="System Logo"
                className="w-11 h-11 object-contain rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-[#1A1D23] shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg md:text-xl text-[#1E293B] dark:text-[#E0E2E6] tracking-tight uppercase">
                  {tournamentConfig.tournamentName.split(' ').slice(0, -1).join(' ')}<span className="text-[#D4AF37]"> {tournamentConfig.tournamentName.split(' ').slice(-1)}</span>
                </h1>
                <span className="text-[10px] font-bold font-mono bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20">
                  {tournamentConfig.playersCount} PLAYERS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5 font-medium">
                {tournamentConfig.dateRange} • Venue:{' '}
                <span className="text-[#D4AF37] font-bold uppercase">{tournamentConfig.venue}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Simulation, resets, theme toggle) */}
          <div className="flex items-center gap-3.5 flex-wrap">
            {/* User Session Info & Log Out */}
            {currentUser && (
              <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all">
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-700 dark:text-[#E0E2E6]">{currentUser.username}</span>
                  <span className="text-[9px] text-[#D4AF37] uppercase font-mono tracking-wider font-extrabold">{currentUser.role}</span>
                </div>
                <button
                  onClick={() => handleLogin(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Sign Out / Lock Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              id="theme-toggle"
              className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#D4AF37] hover:bg-slate-200 dark:hover:bg-[#12151A] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isTournamentStarted && (
              <button
                onClick={handleAutoSimulateAllReady}
                id="btn-auto-simulate-round"
                className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-3 py-2 rounded-xl transition-all cursor-pointer"
                title="Autofills and advances matches for the currently ready brackets"
              >
                <Sparkles className="w-3.5 h-3.5" /> Fast Sim Matches
              </button>
            )}

            <button
              onClick={handleResetEntireTournament}
              id="btn-reset-tournament"
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/5 border border-red-500/15 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Wipe all data and reset system to defaults (Requires Admin PIN)"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Wipe System
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner when Champion is crowned */}
      {champion && (
        <div className="bg-gradient-to-r from-[#D4AF37]/10 via-[#D4AF37]/20 to-[#D4AF37]/10 border-b border-[#D4AF37]/30 py-4 px-4 text-center animate-pulse-subtle flex flex-col sm:flex-row items-center justify-center gap-3">
          <Award className="w-6 h-6 text-[#D4AF37] shrink-0" />
          <p className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider font-serif">
            Championship Concluded! 🏆 Congratulations to the Champion:{' '}
            <span className="text-slate-800 dark:text-[#E0E2E6] underline decoration-[#D4AF37] underline-offset-4 font-sans">{champion.name}</span>!
          </p>
          <button
            onClick={() => {
              setActiveTab('display');
            }}
            className="text-xs bg-[#D4AF37] text-[#0F1115] font-bold px-3 py-1 rounded shadow-md hover:bg-[#D4AF37]/80 transition-colors cursor-pointer"
          >
            View Standings Display
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation Tabs bar removed in favor of Sidebar */}

        {/* Tab Contents */}
        <div className="animate-in fade-in-50 duration-200">
          {activeTab === 'dashboard' && (
            <Dashboard 
              tournamentConfig={tournamentConfig} 
              players={players} 
              matches={matches} 
            />
          )}
          {activeTab === 'info' && (
            <TournamentInfo 
              config={tournamentConfig} 
              onViewDay={(day) => {
                setActiveTab('bracket');
                setBracketView(`day${day}` as 'day1' | 'day2' | 'day3');
              }}
            />
          )}

          {activeTab === 'registration' && (
            <RegistrationPortal
              players={players}
              onPlayersChange={handlePlayersChange}
              onStartTournament={handleStartTournament}
              isTournamentStarted={isTournamentStarted}
              playersCount={tournamentConfig.playersCount}
              applications={playerApplications}
              onApplicationsChange={handleApplicationsChange}
            />
          )}

          {activeTab === 'bracket' && isTournamentStarted && (
            tournamentConfig.formatType === 'group' ? (
              <GroupStageView 
                tournamentConfig={tournamentConfig} 
                players={players} 
                matches={matches}
                onStartMatch={handleStartMatch}
                onViewMatch={setSelectedMatchId}
                onUpdateMatch={(matchId, updates) => {
                  console.log('DEBUG: Updating match', matchId, 'with', updates);
                  setMatches(prev => {
                    const newMatches = prev.map(m => m.id === matchId ? { ...m, ...updates } : m);
                    safeStorage.setItem('snooker_matches', JSON.stringify(newMatches));
                    saveStateToServer({ matches: newMatches });
                    return newMatches;
                  });
                }}
                onGenerateFixtures={() => {
                  console.log('Generating fixtures with groups:', tournamentConfig.groups);
                  if (tournamentConfig.groups && tournamentConfig.groups.length > 0) {
                    const fixtures = generateGroupFixtures(tournamentConfig.groups);
                    console.log('Generated fixtures:', fixtures);
                    setMatches(fixtures);
                  } else {
                    console.warn('No groups found to generate fixtures');
                  }
                }}
              />
            ) : (
              <TournamentBracket
                matches={matches}
                players={players}
                tournamentConfig={tournamentConfig}
                onSelectMatch={handleSelectMatch}
                onStartMatch={handleStartMatch}
                bracketView={bracketView}
                setBracketView={setBracketView}
              />
            )
          )}

          {activeTab === 'display' && isTournamentStarted && (
            <LiveDisplayScreen players={players} matches={matches} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              config={tournamentConfig}
              onUpdateConfig={handleUpdateConfig}
              users={systemUsers}
              players={players}
              onUpdateUsers={handleUpdateUsers}
              currentUser={currentUser}
              onLogin={handleLogin}
              isTournamentStarted={isTournamentStarted}
              rolePermissions={rolePermissions}
              onUpdateRolePermissions={handleUpdateRolePermissions}
              publicRegistrationEnabled={publicRegistrationEnabled}
              onPublicRegistrationEnabledChange={(val) => {
                setPublicRegistrationEnabled(val);
                saveStateToServer({ publicRegistrationEnabled: val });
              }}
              systemLogo={systemLogo}
              onUpdateSystemLogo={handleUpdateSystemLogo}
            />
          )}
        </div>
      </main>

      {/* Match Scorer Modal Overlay */}
      {selectedMatchId && (
        <MatchScorerModal
          match={matches.find((m) => m.id === selectedMatchId) || null}
          players={players}
          formatType={tournamentConfig.formatType}
          onClose={() => setSelectedMatchId(null)}
          onSaveScore={handleSaveScore}
          onUpdateLiveScore={handleUpdateLiveScore}
          onStartMatch={handleStartMatch}
        />
      )}

      {/* Wipe Confirmation Modal Overlay */}
      <ConfirmModal
        isOpen={showWipeConfirm}
        title="Wipe Entire System"
        message="Are you sure you want to reset everything? This will permanently delete all registered players, match results, and bracket histories. This action cannot be undone."
        confirmText="Reset System"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmWipe}
        onCancel={() => setShowWipeConfirm(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold max-w-md transition-colors duration-300 ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 backdrop-blur-md'
              : toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md'
              : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] backdrop-blur-md'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 animate-bounce" />
            ) : toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <Info className="w-5 h-5 shrink-0" />
            )}
            <p className="leading-tight">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Elegant minimalist footer */}
      <footer className="border-t border-slate-200 dark:border-[#2A2E37] bg-white dark:bg-[#15181F] py-6 text-center text-xs text-slate-500 dark:text-[#6B7280] font-sans tracking-wide transition-colors duration-300">
        <p>© 2026 CLASS 46 SNOOKER CHAMPIONSHIP Administration • All Rights Reserved</p>
      </footer>
      </div>
    </div>
  );
}
