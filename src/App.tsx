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
  MapPin,
  Sparkles,
  RefreshCw,
  Award,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle,
  Settings,
  LogOut,
  StopCircle,
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
import MainLandingPage from './components/MainLandingPage';
import PlayerApplicationForm from './components/PlayerApplicationForm';
import { getSupabase, handleClientSupabaseError } from './utils/supabaseClient';
import Sidebar from './components/Sidebar';

const isUUID = (id: any): boolean => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const safeIsoString = (timeStr: any, dayNum?: number): string => {
  if (!timeStr) return new Date().toISOString();
  const parsed = new Date(timeStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  try {
    const day = dayNum || 1;
    let hour = 12;
    let minute = 0;
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
    }
    const date = new Date();
    date.setDate(date.getDate() + (day - 1));
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

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

let cachedPlayersColumns: string[] | null = null;
let lastColumnFetchTime = 0;

const getPlayersTableColumns = async (supabase: any): Promise<string[]> => {
  const now = Date.now();
  if (cachedPlayersColumns && (now - lastColumnFetchTime < 300000)) {
    return cachedPlayersColumns;
  }

  const url = supabase.supabaseUrl || (supabase as any).url;
  const key = supabase.supabaseKey || (supabase as any).key;

  if (!url || !key) {
    return ['id', 'profile_id', 'created_at', 'name'];
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Accept': 'application/openapi+json'
      }
    });
    if (res.ok) {
      const schema = await res.json();
      const properties = schema.definitions?.players?.properties;
      if (properties) {
        cachedPlayersColumns = Object.keys(properties);
        lastColumnFetchTime = now;
        console.log(`[Supabase Schema Detector] Detected valid columns for 'players':`, cachedPlayersColumns);
        return cachedPlayersColumns;
      }
    }
  } catch (err: any) {
    console.warn(`[Supabase Schema Detector] Failed to fetch OpenAPI columns:`, err?.message || err);
  }

  return ['id', 'profile_id', 'created_at', 'name'];
};

const insertPlayerToSupabase = async (supabase: any, playerOrProfile: any) => {
  const pid = playerOrProfile.id || playerOrProfile.profile_id;
  if (!pid) return false;

  const fullName = playerOrProfile.name || playerOrProfile.player_name || playerOrProfile.fullName || playerOrProfile.full_name || 'Tournament Player';
  const nickname = playerOrProfile.nickname || null;
  const club = playerOrProfile.club || null;
  const seed = playerOrProfile.seed || 1;
  const status = playerOrProfile.status === 'approved' ? 'active' : (playerOrProfile.status || 'active');
  const photoUrl = playerOrProfile.photoUrl || playerOrProfile.photo_url || null;
  const matches_played = playerOrProfile.matchesPlayed ?? playerOrProfile.matches_played ?? 0;
  const matches_won = playerOrProfile.matchesWon ?? playerOrProfile.matches_won ?? 0;
  const total_points = playerOrProfile.totalPoints ?? playerOrProfile.total_points ?? 0;
  const highest_break = playerOrProfile.highestBreak ?? playerOrProfile.highest_break ?? 0;
  const tournament_type = playerOrProfile.tournamentType ?? playerOrProfile.tournament_type ?? null;

  let possiblePayload: Record<string, any> = {
    id: pid,
    profile_id: pid,
    player_name: fullName,
    name: fullName,
    nickname,
    club,
    seed,
    status,
    photo_url: photoUrl,
    photoUrl: photoUrl,
    matches_played,
    matches_won,
    total_points,
    highest_break,
    tournament_type,
    tournamentType: tournament_type
  };

  const validColumns = await getPlayersTableColumns(supabase);
  let payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(possiblePayload)) {
    if (validColumns.includes(key)) {
      payload[key] = val;
    }
  }

  const attemptInsert = async (currentPayload: Record<string, any>, attemptCount: number): Promise<boolean> => {
    if (attemptCount > 15) {
      console.error("[Supabase Self-Healing Insert] Exceeded maximum self-healing attempts.");
      return false;
    }

    console.log(`[Supabase Self-Healing Insert] Attempt ${attemptCount}: Inserting with keys [${Object.keys(currentPayload).join(', ')}]`);

    try {
      const { error } = await supabase.from('players').insert(currentPayload);
      if (!error) {
        console.log(`[Supabase Self-Healing Insert] Successfully inserted player ${fullName} with ${Object.keys(currentPayload).length} columns!`);
        return true;
      }

      const errMsg = error.message || '';
      const errDetails = error.details || '';
      const fullErrorText = `${errMsg} ${errDetails}`;
      console.warn(`[Supabase Self-Healing Insert] Attempt ${attemptCount} failed: "${fullErrorText}"`);

      let missingColumn: string | null = null;
      const match1 = fullErrorText.match(/Could not find the '([^']+)' column/i);
      if (match1) {
        missingColumn = match1[1];
      }

      if (!missingColumn) {
        const match2 = fullErrorText.match(/column "([^"]+)" of relation/i);
        if (match2) {
          missingColumn = match2[1];
        }
      }

      if (!missingColumn) {
        const match3 = fullErrorText.match(/column "([^"]+)" does not exist/i);
        if (match3) {
          missingColumn = match3[1];
        }
      }

      if (missingColumn) {
        console.log(`[Supabase Self-Healing Insert] Detected missing column: '${missingColumn}'. Removing and retrying...`);
        const nextPayload = { ...currentPayload };
        delete nextPayload[missingColumn];
        
        if (missingColumn === 'photo_url') delete nextPayload['photoUrl'];
        if (missingColumn === 'photoUrl') delete nextPayload['photo_url'];
        if (missingColumn === 'tournament_type') delete nextPayload['tournamentType'];
        if (missingColumn === 'tournamentType') delete nextPayload['tournament_type'];

        if (Object.keys(nextPayload).length === 0) {
          console.error(`[Supabase Self-Healing Insert] Payload is empty.`);
          return false;
        }

        return await attemptInsert(nextPayload, attemptCount + 1);
      }

      console.error(`[Supabase Self-Healing Insert] Terminal error:`, error);
      return false;
    } catch (err: any) {
      console.error(`[Supabase Self-Healing Insert] Catch block error:`, err?.message || err);
      return false;
    }
  };

  return await attemptInsert(payload, 1);
};

const updatePlayerInSupabase = async (supabase: any, player: any, currentPhotoUrl: string | null) => {
  const pid = player.id || player.profile_id;
  if (!pid) return false;

  const fullName = player.name || player.player_name || player.fullName || player.full_name || 'Tournament Player';
  const nickname = player.nickname || null;
  const club = player.club || null;
  const seed = player.seed || 1;
  const status = player.status || 'active';
  const photoUrl = currentPhotoUrl || player.photoUrl || player.photo_url || null;
  const matches_played = player.matchesPlayed ?? player.matches_played ?? 0;
  const matches_won = player.matchesWon ?? player.matches_won ?? 0;
  const total_points = player.totalPoints ?? player.total_points ?? 0;
  const highest_break = player.highestBreak ?? player.highest_break ?? 0;
  const tournament_type = player.tournamentType ?? player.tournament_type ?? null;

  let possiblePayload: Record<string, any> = {
    player_name: fullName,
    name: fullName,
    nickname,
    club,
    seed,
    status,
    photo_url: photoUrl,
    photoUrl: photoUrl,
    matches_played,
    matches_won,
    total_points,
    highest_break,
    tournament_type,
    tournamentType: tournament_type
  };

  const validColumns = await getPlayersTableColumns(supabase);
  let payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(possiblePayload)) {
    if (validColumns.includes(key)) {
      payload[key] = val;
    }
  }

  const attemptUpdate = async (currentPayload: Record<string, any>, attemptCount: number): Promise<boolean> => {
    if (attemptCount > 15) {
      console.error("[Supabase Self-Healing Update] Exceeded maximum self-healing attempts.");
      return false;
    }

    console.log(`[Supabase Self-Healing Update] Attempt ${attemptCount}: Updating with keys [${Object.keys(currentPayload).join(', ')}]`);

    try {
      const { error } = await supabase
        .from('players')
        .update(currentPayload)
        .or(`profile_id.eq.${pid},id.eq.${pid}`);

      if (!error) {
        console.log(`[Supabase Self-Healing Update] Successfully updated player ${fullName} with ${Object.keys(currentPayload).length} columns!`);
        return true;
      }

      const errMsg = error.message || '';
      const errDetails = error.details || '';
      const fullErrorText = `${errMsg} ${errDetails}`;
      console.warn(`[Supabase Self-Healing Update] Attempt ${attemptCount} failed: "${fullErrorText}"`);

      let missingColumn: string | null = null;
      const match1 = fullErrorText.match(/Could not find the '([^']+)' column/i);
      if (match1) {
        missingColumn = match1[1];
      }

      if (!missingColumn) {
        const match2 = fullErrorText.match(/column "([^"]+)" of relation/i);
        if (match2) {
          missingColumn = match2[1];
        }
      }

      if (!missingColumn) {
        const match3 = fullErrorText.match(/column "([^"]+)" does not exist/i);
        if (match3) {
          missingColumn = match3[1];
        }
      }

      if (missingColumn) {
        console.log(`[Supabase Self-Healing Update] Detected missing column: '${missingColumn}'. Removing and retrying...`);
        const nextPayload = { ...currentPayload };
        delete nextPayload[missingColumn];
        
        if (missingColumn === 'photo_url') delete nextPayload['photoUrl'];
        if (missingColumn === 'photoUrl') delete nextPayload['photo_url'];
        if (missingColumn === 'tournament_type') delete nextPayload['tournamentType'];
        if (missingColumn === 'tournamentType') delete nextPayload['tournament_type'];

        if (Object.keys(nextPayload).length === 0) {
          console.error(`[Supabase Self-Healing Update] Payload is empty.`);
          return false;
        }

        return await attemptUpdate(nextPayload, attemptCount + 1);
      }

      console.error(`[Supabase Self-Healing Update] Terminal error:`, error);
      return false;
    } catch (err: any) {
      console.error(`[Supabase Self-Healing Update] Catch block error:`, err?.message || err);
      return false;
    }
  };

  return await attemptUpdate(payload, 1);
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Array<{ stage: string; status: 'active' | 'not started' | 'ended' }>>([
    { stage: 'Round of 32', status: 'not started' },
    { stage: 'Round of 16', status: 'not started' },
    { stage: 'Quarter finals', status: 'not started' },
    { stage: 'Semi finals', status: 'not started' },
    { stage: 'Final', status: 'not started' }
  ]);
  const [bracketView, setBracketView] = useState<'full' | 'day1' | 'day2' | 'day3' | 'minimized'>('full');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bracket' | 'display' | 'registration' | 'info' | 'settings'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTournamentStarted, setIsTournamentStarted] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
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
      first: '₦500,000',
      second: '₦150,000',
    },
    tournamentTypes: ['Soccer', 'Snooker', 'Table Tennis'],
    selectedTournamentType: 'Snooker'
  });

  // Role-Based Access Control users state loaded purely from Supabase system_users table
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  // State to track if Supabase service is suspended/restricted (e.g. egress quota exceeded)
  const [isSupabaseSuspended, setIsSupabaseSuspended] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('supabase_suspended') === 'true';
  });

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
  const [showMainLogin, setShowMainLogin] = useState(false);

  const [systemLogo, setSystemLogo] = useState<string>('https://fmbwnbvhvcuihzifiajk.supabase.co/storage/v1/object/public/website_logo/46.png');

  const handleUpdateSystemLogo = (newLogo: string) => {
    setSystemLogo(newLogo);
    safeStorage.setItem('snooker_system_logo', newLogo);
    saveStateToServer({ systemLogo: newLogo });
  };

  const saveStateToServer = async (patch: any) => {
    let succeeded = false;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        succeeded = true;
      }
    } catch (e) {
      console.warn('Could not sync state to server:', e);
    }

    // Direct Client-side Supabase updates - Unconditional if Supabase is configured
    const supabase = getSupabase();
    if (supabase) {
      if (patch.playerApplications && Array.isArray(patch.playerApplications)) {
        try {
          for (const app of patch.playerApplications) {
            if (!isUUID(app.id)) continue; // Only process valid UUIDs

            const { error: updateError } = await supabase
              .from('profiles')
              .update({ status: app.status })
              .eq('id', app.id);
            if (updateError) {
              console.log(`[Client Supabase] Update profile status notice for ${app.id}:`, updateError.message);
            }

            if (app.status === 'approved') {
              try {
                const { data: existingPlayer } = await supabase
                  .from('players')
                  .select('id')
                  .or(`profile_id.eq.${app.id},id.eq.${app.id}`)
                  .maybeSingle();

                if (!existingPlayer) {
                  await insertPlayerToSupabase(supabase, app);
                }
              } catch (pErr: any) {
                console.log(`[Client Supabase Player Sync] Check error for ${app.id}:`, pErr?.message || pErr);
              }
            }
          }
        } catch (err: any) {
          console.log('[Client Supabase] Status sync notice:', err?.message || err);
        }
      }

        if (patch.players && Array.isArray(patch.players)) {
          try {
            for (const player of patch.players) {
              if (!isUUID(player.id)) continue; // Only process valid UUIDs

              let currentPhotoUrl = player.photoUrl;

              // Handle base64 image replacement and upload on the client
              if (currentPhotoUrl && currentPhotoUrl.startsWith('data:')) {
                try {
                  // Fetch the existing profile to get the old photo url
                  const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('photo_url')
                    .eq('id', player.id)
                    .maybeSingle();

                  const oldPhotoUrl = existingProfile?.photo_url;

                  // Convert base64 to Blob
                  const base64ToBlobLocal = (base64String: string) => {
                    const parts = base64String.split(',');
                    if (parts.length < 2) return null;
                    const metadata = parts[0];
                    const base64Data = parts[1];
                    const contentTypeMatch = metadata.match(/data:([^;]+);/);
                    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
                    
                    let binary: string;
                    if (metadata.includes('base64')) {
                      binary = atob(base64Data);
                    } else {
                      binary = decodeURIComponent(base64Data);
                    }
                    const len = binary.length;
                    const buffer = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      buffer[i] = binary.charCodeAt(i);
                    }
                    return { blob: new Blob([buffer], { type: contentType }), contentType };
                  };

                  const fileRes = base64ToBlobLocal(currentPhotoUrl);
                  if (fileRes) {
                    const ext = fileRes.contentType.split('/')[1] || 'png';
                    const fileName = `${player.id}_photo_${Date.now()}.${ext}`;
                    
                    const bucketCandidates = [
                      'player photos',
                      'player-photos',
                      'player_photos'
                    ];
                    
                    let uploadedUrl = null;
                    for (const bucketId of bucketCandidates) {
                      try {
                        const fileToUpload = new File([fileRes.blob], fileName, { type: fileRes.contentType });
                        const { data, error } = await supabase.storage
                          .from(bucketId)
                          .upload(fileName, fileToUpload, { contentType: fileRes.contentType, upsert: true });

                        if (!error && data) {
                          const { data: { publicUrl } } = supabase.storage.from(bucketId).getPublicUrl(fileName);
                          uploadedUrl = publicUrl;
                          break;
                        }
                      } catch (err) {}
                    }

                    if (uploadedUrl) {
                      currentPhotoUrl = uploadedUrl;
                      player.photoUrl = uploadedUrl; // Update local reference so state stays synchronized

                      // Remove old photo from storage if it existed
                      if (oldPhotoUrl && oldPhotoUrl.includes('/storage/v1/object/public/')) {
                        try {
                          const parts = oldPhotoUrl.split('/');
                          const oldFilename = parts[parts.length - 1];
                          if (oldFilename) {
                            const bucketCandidates = ['player photos', 'player-photos', 'player_photos'];
                            for (const b of bucketCandidates) {
                              await supabase.storage.from(b).remove([oldFilename]);
                            }
                          }
                        } catch (delErr) {
                          console.log('[Client Supabase Storage] Old photo deletion issue:', delErr);
                        }
                      }
                    }
                  }
                } catch (photoErr: any) {
                  console.log(`[Client Supabase Player Photo Sync Error] ${player.id}:`, photoErr?.message || photoErr);
                }
              }

              // Update profiles
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: player.name,
                  nickname: player.nickname || null,
                  club: player.club || null,
                  photo_url: currentPhotoUrl || null,
                  tournament_type: player.tournamentType || null,
                  status: player.status,
                  seed: player.seed,
                  matches_played: player.matchesPlayed,
                  matches_won: player.matchesWon,
                  total_points: player.totalPoints,
                  highest_break: player.highestBreak,
                })
                .eq('id', player.id);
              if (updateError) {
                console.log(`[Client Supabase] Update profile stats notice for user ${player.id}:`, updateError.message);
              }

              // Update players table
              try {
                // Check if player exists in the players table
                const { data: existingPlayer } = await supabase
                  .from('players')
                  .select('id')
                  .or(`profile_id.eq.${player.id},id.eq.${player.id}`)
                  .maybeSingle();

                if (existingPlayer) {
                  await updatePlayerInSupabase(supabase, player, currentPhotoUrl);
                } else {
                  // Player does not exist, let's insert them!
                  const playerToInsert = {
                    ...player,
                    photoUrl: currentPhotoUrl
                  };
                  await insertPlayerToSupabase(supabase, playerToInsert);
                }
              } catch (pe) {
                console.log(`[Client Supabase] Update/Insert players table error:`, pe);
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase] Player stats sync notice:', err?.message || err);
          }
        }

        if (patch.wipeBoard) {
          try {
            console.log('[Client Supabase] Wipe Board action. Deleting players and resetting profiles status and seed...');
            
            // 1. Delete all rows from players table
            const { error: deletePlayersErr } = await supabase
              .from('players')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
            if (deletePlayersErr) {
              console.log('[Client Supabase] Wipe Board delete players notice:', deletePlayersErr.message);
            }

            // 2. Update profiles table status back to pending and seed back to null
            const { error: resetProfilesErr } = await supabase
              .from('profiles')
              .update({
                status: 'pending',
                seed: null
              })
              .neq('id', '00000000-0000-0000-0000-000000000000');
            if (resetProfilesErr) {
              console.log('[Client Supabase] Wipe Board reset profiles notice:', resetProfilesErr.message);
            }
          } catch (err: any) {
            console.log('[Client Supabase] Wipe Board error:', err?.message || err);
          }
        }

        if (patch.wipePlayersAndAuthUsers) {
          try {
            const { data: dbProfiles, error: fetchErr } = await supabase
              .from('profiles')
              .select('id');
            if (!fetchErr && dbProfiles && dbProfiles.length > 0) {
              const ids = dbProfiles.map((p: any) => p.id);
              const { error: deleteProfilesErr } = await supabase
                .from('profiles')
                .delete()
                .in('id', ids);
              if (deleteProfilesErr) {
                console.log('[Client Supabase] Delete profiles notice:', deleteProfilesErr.message);
              }

              for (const id of ids) {
                if (supabase.auth?.admin?.deleteUser) {
                  await supabase.auth.admin.deleteUser(id);
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase] Wipe notice:', err?.message || err);
          }
        }

        if (patch.systemUsers && Array.isArray(patch.systemUsers)) {
          try {
            const currentUsers = patch.systemUsers;
            const usernames = currentUsers.map((u: any) => u.username);

            // 1. Fetch current database system_users to determine who to delete
            const { data: dbUsers, error: fetchErr } = await supabase
              .from('system_users')
              .select('id, username');

            if (!fetchErr && dbUsers) {
              const usernamesToDelete = dbUsers
                .filter((du: any) => !usernames.includes(du.username))
                .map((du: any) => du.username);

              if (usernamesToDelete.length > 0) {
                await supabase
                  .from('system_users')
                  .delete()
                  .in('username', usernamesToDelete);
              }
            }

            // 2. Upsert each user
            for (const user of currentUsers) {
              const payload: any = {
                username: user.username,
                role: user.role,
                pin: user.pin,
              };
              if (isUUID(user.id)) {
                payload.id = user.id;
              }

              await supabase
                .from('system_users')
                .upsert(payload, { onConflict: 'username' });
            }
          } catch (err: any) {
            console.log('[Client Supabase] system_users sync notice:', err?.message || err);
          }
        }

        if (patch.tournamentConfig) {
          try {
            const { tournamentTypes, selectedTournamentType } = patch.tournamentConfig;
            if (Array.isArray(tournamentTypes)) {
              const { data: currentDbTypes, error: selectErr } = await supabase
                .from('tournament_types')
                .select('*');

              if (!selectErr && currentDbTypes) {
                const dbTypeNames = currentDbTypes.map((t: any) => t.name);
                const toDelete = dbTypeNames.filter(name => !tournamentTypes.includes(name));
                if (toDelete.length > 0) {
                  await supabase
                    .from('tournament_types')
                    .delete()
                    .in('name', toDelete);
                }

                for (const type of tournamentTypes) {
                  const isActive = type === selectedTournamentType;
                  await supabase
                    .from('tournament_types')
                    .upsert({
                      name: type,
                      is_active: isActive
                    }, { onConflict: 'name' });
                }
              }
            } else if (selectedTournamentType) {
              await supabase
                .from('tournament_types')
                .update({ is_active: false })
                .not('name', 'eq', selectedTournamentType);

              await supabase
                .from('tournament_types')
                .update({ is_active: true })
                .eq('name', selectedTournamentType);
            }
          } catch (err: any) {
            console.log('[Client Supabase] Tournament types sync notice:', err?.message || err);
          }
        }

        // 4. Update round_of_32, round_of_16, quarter_finals, semi_finals, grand_final, and third_place tables on bracket start or match update
        if (patch.isTournamentStarted === false || (patch.matches && patch.matches.length === 0)) {
          try {
            await Promise.all([
              supabase.from('round_of_32').delete().neq('match_number', 0),
              supabase.from('round_of_16').delete().neq('match_number', 0),
              supabase.from('quarter_finals').delete().neq('match_number', 0),
              supabase.from('semi_finals').delete().neq('match_number', 0),
              supabase.from('grand_final').delete().neq('match_number', 0),
              supabase.from('third_place').delete().neq('match_number', 0)
            ]);
          } catch (e) {
            console.log('[Client Supabase R32/R16/QF/SF/GF/TP Reset] Error:', e);
          }
        }

        if (patch.matches && Array.isArray(patch.matches)) {
          const currentPlayers = patch.players || players;
          // Sync Round of 32
          try {
            const r32Matches = patch.matches.filter((m: any) => m.round === 'R32' || m.id.startsWith('M'));
            if (r32Matches.length > 0) {
              const rowsToUpsert = r32Matches.map((m: any) => {
                const matchNumStr = m.id.replace(/\D/g, ''); // Extract digits
                const matchNumber = parseInt(matchNumStr, 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 16) {
                  return null;
                }

                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: matchNumber,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 1),
                  table_number: m.table_number || matchNumber,
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsert.length > 0) {
                const { error: upsertErr } = await supabase
                  .from('round_of_32')
                  .upsert(rowsToUpsert, { onConflict: 'match_number' });

                if (upsertErr) {
                  console.log('[Client Supabase round_of_32 Sync] Upsert notice:', upsertErr.message);
                } else {
                  console.log('[Client Supabase round_of_32 Sync] Successfully synced matches to round_of_32');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase round_of_32 Sync] General error:', err?.message || err);
          }

          // Sync Round of 16
          try {
            const r16Matches = patch.matches.filter((m: any) => m.round === 'R16' || m.id.startsWith('R16-'));
            if (r16Matches.length > 0) {
              const rowsToUpsertR16 = r16Matches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 8) {
                  return null;
                }

                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: matchNumber,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 2),
                  table_number: m.table_number || (matchNumber + 16),
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsertR16.length > 0) {
                const { error: upsertR16Err } = await supabase
                  .from('round_of_16')
                  .upsert(rowsToUpsertR16, { onConflict: 'match_number' });

                if (upsertR16Err) {
                  console.log('[Client Supabase round_of_16 Sync] Upsert notice:', upsertR16Err.message);
                } else {
                  console.log('[Client Supabase round_of_16 Sync] Successfully synced matches to round_of_16');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase round_of_16 Sync] General error:', err?.message || err);
          }

          // Sync Quarter Finals
          try {
            const qfMatches = patch.matches.filter((m: any) => m.round === 'QF' || m.id.startsWith('QF-'));
            if (qfMatches.length > 0) {
              const rowsToUpsertQF = qfMatches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 4) {
                  return null;
                }

                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: matchNumber,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 2),
                  table_number: m.table_number || (matchNumber + 24),
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsertQF.length > 0) {
                const { error: upsertQFErr } = await supabase
                  .from('quarter_finals')
                  .upsert(rowsToUpsertQF, { onConflict: 'match_number' });

                if (upsertQFErr) {
                  console.log('[Client Supabase quarter_finals Sync] Upsert notice:', upsertQFErr.message);
                } else {
                  console.log('[Client Supabase quarter_finals Sync] Successfully synced matches to quarter_finals');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase quarter_finals Sync] General error:', err?.message || err);
          }

          // Sync Semi Finals
          try {
            const sfMatches = patch.matches.filter((m: any) => m.round === 'SF' || m.id.startsWith('SF-'));
            if (sfMatches.length > 0) {
              const rowsToUpsertSF = sfMatches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 2) {
                  return null;
                }

                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: matchNumber,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
                  table_number: m.table_number || (matchNumber + 28),
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsertSF.length > 0) {
                const { error: upsertSFErr } = await supabase
                  .from('semi_finals')
                  .upsert(rowsToUpsertSF, { onConflict: 'match_number' });

                if (upsertSFErr) {
                  console.log('[Client Supabase semi_finals Sync] Upsert notice:', upsertSFErr.message);
                } else {
                  console.log('[Client Supabase semi_finals Sync] Successfully synced matches to semi_finals');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase semi_finals Sync] General error:', err?.message || err);
          }

          // Sync Grand Final
          try {
            const gfMatches = patch.matches.filter((m: any) => m.id === 'FINAL' || m.round === 'F');
            if (gfMatches.length > 0) {
              const rowsToUpsertGF = gfMatches.map((m: any) => {
                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: 1,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
                  table_number: m.table_number || 1,
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsertGF.length > 0) {
                const { error: upsertGFErr } = await supabase
                  .from('grand_final')
                  .upsert(rowsToUpsertGF, { onConflict: 'match_number' });

                if (upsertGFErr) {
                  console.log('[Client Supabase grand_final Sync] Upsert notice:', upsertGFErr.message);
                } else {
                  console.log('[Client Supabase grand_final Sync] Successfully synced match to grand_final');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase grand_final Sync] General error:', err?.message || err);
          }

          // Sync 3rd Place Match
          try {
            const tpMatches = patch.matches.filter((m: any) => m.id === '3RD-1' || m.round === '3RD');
            if (tpMatches.length > 0) {
              const rowsToUpsertTP = tpMatches.map((m: any) => {
                const p1 = currentPlayers.find(p => p.id === m.player1Id);
                const p2 = currentPlayers.find(p => p.id === m.player2Id);
                const p1Name = p1 ? p1.name : 'TBD';
                const p2Name = p2 ? p2.name : 'TBD';

                return {
                  match_number: 1,
                  player1_id: isUUID(m.player1Id) ? m.player1Id : null,
                  player2_id: isUUID(m.player2Id) ? m.player2Id : null,
                  player1_name: p1Name,
                  player2_name: p2Name,
                  player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
                  player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
                  player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
                  player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
                  player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
                  player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
                  player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
                  player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
                  player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
                  player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
                  winner_id: isUUID(m.winnerId) ? m.winnerId : null,
                  winner_name: m.winnerId ? (currentPlayers.find(p => p.id === m.winnerId)?.name || null) : null,
                  status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
                  scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
                  table_number: m.table_number || 2,
                  referee_name: m.referee_name || null,
                  tournament_type: m.tournament_type || 'Snooker'
                };
              }).filter(Boolean);

              if (rowsToUpsertTP.length > 0) {
                const { error: upsertTPErr } = await supabase
                  .from('third_place')
                  .upsert(rowsToUpsertTP, { onConflict: 'match_number' });

                if (upsertTPErr) {
                  console.log('[Client Supabase third_place Sync] Upsert notice:', upsertTPErr.message);
                } else {
                  console.log('[Client Supabase third_place Sync] Successfully synced match to third_place');
                }
              }
            }
          } catch (err: any) {
            console.log('[Client Supabase third_place Sync] General error:', err?.message || err);
          }

          // Sync rounds table status to active when a match in that round is playing or ongoing
          try {
            const hasActiveR32 = patch.matches.some((m: any) => (m.round === 'R32' || m.id.startsWith('M')) && (m.status === 'playing' || m.status === 'ongoing'));
            const hasActiveR16 = patch.matches.some((m: any) => (m.round === 'R16' || m.id.startsWith('R16-')) && (m.status === 'playing' || m.status === 'ongoing'));
            const hasActiveQF = patch.matches.some((m: any) => (m.round === 'QF' || m.id.startsWith('QF-')) && (m.status === 'playing' || m.status === 'ongoing'));
            const hasActiveSF = patch.matches.some((m: any) => (m.round === 'SF' || m.id.startsWith('SF-')) && (m.status === 'playing' || m.status === 'ongoing'));
            const hasActiveGF = patch.matches.some((m: any) => (m.id === 'FINAL' || m.round === 'F') && (m.status === 'playing' || m.status === 'ongoing'));

            if (hasActiveR32) {
              await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Round of 32');
              setRounds(prev => prev.map(r => r.stage === 'Round of 32' ? { ...r, status: 'active' } : r));
            }
            if (hasActiveR16) {
              await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Round of 16');
              setRounds(prev => prev.map(r => r.stage === 'Round of 16' ? { ...r, status: 'active' } : r));
            }
            if (hasActiveQF) {
              await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Quarter finals');
              setRounds(prev => prev.map(r => r.stage === 'Quarter finals' ? { ...r, status: 'active' } : r));
            }
            if (hasActiveSF) {
              await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Semi finals');
              setRounds(prev => prev.map(r => r.stage === 'Semi finals' ? { ...r, status: 'active' } : r));
            }
            if (hasActiveGF) {
              await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Final');
              setRounds(prev => prev.map(r => r.stage === 'Final' ? { ...r, status: 'active' } : r));
            }
          } catch (err: any) {
            console.log('[Client Supabase rounds active update] General error:', err?.message || err);
          }
        }
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

      if (savedMatches) {
        setMatches(JSON.parse(savedMatches));
      }
      if (savedStarted) {
        setIsTournamentStarted(JSON.parse(savedStarted));
      }
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (!parsed.tournamentTypes || !Array.isArray(parsed.tournamentTypes)) {
          parsed.tournamentTypes = ['Soccer', 'Snooker', 'Table Tennis'];
        }
        if (!parsed.selectedTournamentType) {
          parsed.selectedTournamentType = parsed.tournamentTypes[0] || 'Snooker';
        }
        let changed = false;
        if (parsed.prizes) {
          if (parsed.prizes.first === '₦350,000 + Certificate' || parsed.prizes.first === '₦500,000 + Certificate') {
            parsed.prizes.first = '₦500,000';
            changed = true;
          } else if (parsed.prizes.first === '₦350,000') {
            parsed.prizes.first = '₦500,000';
            changed = true;
          }
          if (parsed.prizes.second === '₦150,000 + Certificate') {
            parsed.prizes.second = '₦150,000';
            changed = true;
          }
          if ('highestBreak' in parsed.prizes) {
            delete parsed.prizes.highestBreak;
            changed = true;
          }
          if ('third' in parsed.prizes) {
            delete parsed.prizes.third;
            changed = true;
          }
        }
        setTournamentConfig(parsed);
        if (changed) {
          safeStorage.setItem('snooker_config', JSON.stringify(parsed));
        }
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
      if (savedLogo) {
        setSystemLogo(savedLogo);
      }
    } catch (e) {
      console.log('Storage read notice:', e);
    }
  }, []);

  // Listen for storage changes and periodically poll the API/localStorage to guarantee real-time synchronization
  // in sandboxed iframe environments or sibling tabs where standard StorageEvent might not propagate.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'snooker_matches') {
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
        console.log('Synchronization parsing notice:', err);
      }
    };

    let apiPermanentlyUnavailable = false;
    let lastSupabaseFetchTime = 0;

    const pollSync = async () => {
      const now = Date.now();
      let apiSucceeded = false;
      if (!apiPermanentlyUnavailable) {
        try {
          const res = await fetch('/api/state');
          if (res.ok) {
            apiSucceeded = true;
            const data = await res.json();

            if (data && data.isSupabaseSuspended) {
              setIsSupabaseSuspended(true);
              (window as any).__supabase_suspended = true;
              localStorage.setItem('supabase_suspended', 'true');
            } else {
              setIsSupabaseSuspended(false);
              if (typeof window !== 'undefined') {
                delete (window as any).__supabase_suspended;
              }
              localStorage.removeItem('supabase_suspended');
            }
            
            setPlayers((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(data.players)) {
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

            if (data.rounds) {
              setRounds((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(data.rounds)) {
                  return data.rounds;
                }
                return prev;
              });
            }

            return;
          } else if (res.status === 404) {
            apiPermanentlyUnavailable = true;
            console.log('Backend API /api/state returned 404. This is normal for static web hosting (like Hostinger). Switching to pure client-side Supabase and LocalStorage mode.');
          }
        } catch (err) {
          console.warn('API sync unavailable, falling back to local storage sync:', err);
        }
      }

      // Local storage fallback sync
      try {
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

        // Direct Client-side Supabase fetch fallback if API failed and Supabase is configured
        if (!apiSucceeded) {
          const supabase = getSupabase();
          if (supabase) {
            let dbPlayers: any[] = [];
            // Throttle client-side Supabase queries to every 10 seconds to avoid API limits exhaustion
            if (now - lastSupabaseFetchTime >= 10000) {
              lastSupabaseFetchTime = now;
              try {
                const { data: dbProfiles, error: fetchError } = await supabase
                  .from('profiles')
                  .select('*');

                if (!fetchError && dbProfiles) {
                  const mappedApps = dbProfiles.map((p: any) => ({
                    id: p.id,
                    fullName: p.full_name || '',
                    nickname: p.nickname || '',
                    club: p.club || '',
                    phoneNumber: p.phone_number || '',
                    whatsappNumber: p.whatsapp_number || '',
                    socialMediaPage: p.social_media_page || '',
                    photoUrl: p.photo_url || '',
                    documentUrl: p.document_url || '',
                    documentName: p.document_name || '',
                    status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
                    appliedAt: p.created_at || p.applied_at || new Date().toISOString(),
                    tournamentType: p.tournament_type || ''
                  }));

                  setPlayerApplications((prev) => {
                    if (JSON.stringify(prev) !== JSON.stringify(mappedApps)) {
                      return mappedApps;
                    }
                    return prev;
                  });

                  // Get players from players table in Supabase
                  try {
                    const { data: dbPlayersTable, error: playersFetchError } = await supabase
                      .from('players')
                      .select('*');

                    if (playersFetchError) {
                      console.log('[Client Supabase Sync] Fetch players table error, falling back to profiles:', playersFetchError.message);
                      // Fallback to approved profiles
                      const approvedStatuses = ['approved', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place'];
                      dbPlayers = dbProfiles
                        .filter((p: any) => approvedStatuses.includes(p.status))
                        .map((p: any) => ({
                          id: p.id,
                          name: p.full_name || 'Tournament Player',
                          nickname: p.nickname || '',
                          club: p.club || '',
                          seed: p.seed || 1,
                          photoUrl: p.photo_url || '',
                          matchesPlayed: p.matches_played || 0,
                          matchesWon: p.matches_won || 0,
                          totalPoints: p.total_points || 0,
                          highestBreak: p.highest_break || 0,
                          status: p.status === 'approved' ? 'active' : p.status,
                          tournamentType: p.tournament_type || ''
                        }));
                    } else {
                      // Auto-heal: insert any approved profile that is missing from players table
                      const approvedStatuses = ['approved', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place'];
                      const approvedProfiles = dbProfiles.filter((p: any) => approvedStatuses.includes(p.status));
                      
                      for (const profile of approvedProfiles) {
                        const exists = dbPlayersTable && dbPlayersTable.some((pt: any) => pt.profile_id === profile.id || pt.id === profile.id);
                        if (!exists) {
                          console.log(`[Client Supabase Sync] Auto-inserting missing player for profile ${profile.id} into players table`);
                          await insertPlayerToSupabase(supabase, profile);
                        }
                      }

                      // Re-fetch players table to get a complete list
                      const { data: dbPlayersTableUpdated } = await supabase
                        .from('players')
                        .select('*');

                      const finalPlayersTable = dbPlayersTableUpdated || dbPlayersTable || [];

                      dbPlayers = finalPlayersTable.map((pt: any) => {
                        const matchingProfile = dbProfiles.find((profile: any) => profile.id === pt.profile_id || profile.id === pt.id);
                        return {
                          id: pt.profile_id || pt.id || (matchingProfile ? matchingProfile.id : ''),
                          name: (matchingProfile ? matchingProfile.full_name : '') || pt.player_name || pt.name || 'Tournament Player',
                          nickname: pt.nickname || (matchingProfile ? matchingProfile.nickname : '') || '',
                          club: pt.club || (matchingProfile ? matchingProfile.club : '') || '',
                          seed: pt.seed !== undefined && pt.seed !== null ? Number(pt.seed) : (matchingProfile && matchingProfile.seed !== undefined && matchingProfile.seed !== null ? Number(matchingProfile.seed) : 1),
                          photoUrl: pt.photo_url || pt.photoUrl || (matchingProfile ? matchingProfile.photo_url : '') || '',
                          matchesPlayed: pt.matches_played !== undefined && pt.matches_played !== null ? Number(pt.matches_played) : (pt.matchesPlayed !== undefined ? Number(pt.matchesPlayed) : (matchingProfile && matchingProfile.matches_played !== undefined ? Number(matchingProfile.matches_played) : 0)),
                          matchesWon: pt.matches_won !== undefined && pt.matches_won !== null ? Number(pt.matches_won) : (pt.matchesWon !== undefined ? Number(pt.matchesWon) : (matchingProfile && matchingProfile.matches_won !== undefined ? Number(matchingProfile.matches_won) : 0)),
                          totalPoints: pt.total_points !== undefined && pt.total_points !== null ? Number(pt.total_points) : (pt.totalPoints !== undefined ? Number(pt.totalPoints) : (matchingProfile && matchingProfile.total_points !== undefined ? Number(matchingProfile.total_points) : 0)),
                          highestBreak: pt.highest_break !== undefined && pt.highest_break !== null ? Number(pt.highest_break) : (pt.highestBreak !== undefined ? Number(pt.highestBreak) : (matchingProfile && matchingProfile.highest_break !== undefined ? Number(matchingProfile.highest_break) : 0)),
                          status: pt.status || (matchingProfile && matchingProfile.status === 'approved' ? 'active' : matchingProfile?.status) || 'active',
                          tournamentType: pt.tournament_type || pt.tournamentType || (matchingProfile ? matchingProfile.tournament_type : '') || ''
                        };
                      });
                    }
                  } catch (playerErr: any) {
                    console.log('[Client Supabase Sync] Players table fetch error, falling back to profiles:', playerErr?.message || playerErr);
                    // Fallback to approved profiles
                    const approvedStatuses = ['approved', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place'];
                    dbPlayers = dbProfiles
                      .filter((p: any) => approvedStatuses.includes(p.status))
                      .map((p: any) => ({
                        id: p.id,
                        name: p.full_name || 'Tournament Player',
                        nickname: p.nickname || '',
                        club: p.club || '',
                        seed: p.seed || 1,
                        photoUrl: p.photo_url || '',
                        matchesPlayed: p.matches_played || 0,
                        matchesWon: p.matches_won || 0,
                        totalPoints: p.total_points || 0,
                        highestBreak: p.highest_break || 0,
                        status: p.status === 'approved' ? 'active' : p.status,
                        tournamentType: p.tournament_type || ''
                      }));
                  }

                  dbPlayers.sort((a, b) => (a.seed || 0) - (b.seed || 0));

                  setPlayers((prev) => {
                    const demoPlayers = prev.filter((p) => !isUUID(p.id) || p.id.startsWith('p-') || p.id.startsWith('P-'));
                    const mergedPlayers = [...dbPlayers, ...demoPlayers].sort((a, b) => (a.seed || 0) - (b.seed || 0));
                    if (JSON.stringify(prev) !== JSON.stringify(mergedPlayers)) {
                      return mergedPlayers;
                    }
                    return prev;
                  });
                }

                const { data: dbTypes, error: typesError } = await supabase
                  .from('tournament_types')
                  .select('*');

                if (!typesError && dbTypes && dbTypes.length > 0) {
                  const typesList = dbTypes.map((t: any) => t.name);
                  const activeType = dbTypes.find((t: any) => t.is_active)?.name || typesList[0] || 'Snooker';
                  setTournamentConfig((prev) => {
                    const updated = {
                      ...prev,
                      tournamentTypes: typesList,
                      selectedTournamentType: activeType
                    };
                    if (JSON.stringify(prev) !== JSON.stringify(updated)) {
                      safeStorage.setItem('snooker_config', JSON.stringify(updated));
                      return updated;
                    }
                    return prev;
                  });
                }

                const { data: dbRounds, error: roundsError } = await supabase
                  .from('rounds')
                  .select('*');

                if (!roundsError && dbRounds && dbRounds.length > 0) {
                  const mappedRounds = dbRounds.map((r: any) => ({
                    stage: r.stage,
                    status: r.status as 'active' | 'not started' | 'ended'
                  }));
                  const order = ['Round of 32', 'Round of 16', 'Quarter finals', 'Semi finals', 'Final'];
                  mappedRounds.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
                  setRounds((prev) => {
                    if (JSON.stringify(prev) !== JSON.stringify(mappedRounds)) {
                      return mappedRounds;
                    }
                    return prev;
                  });
                }

                // Fetch system_users directly from Supabase
                try {
                  const { data: dbSystemUsers, error: usersFetchError } = await supabase
                    .from('system_users')
                    .select('*');

                  if (usersFetchError) {
                    handleClientSupabaseError(usersFetchError);
                  } else if (dbSystemUsers && dbSystemUsers.length > 0) {
                    const mappedUsers = dbSystemUsers.map((u: any) => ({
                      id: u.id,
                      username: u.username,
                      role: u.role,
                      pin: u.pin
                    }));
                    setSystemUsers((prev) => {
                      if (JSON.stringify(prev) !== JSON.stringify(mappedUsers)) {
                        return mappedUsers;
                      }
                      return prev;
                    });
                  }
                } catch (userErr) {
                  console.log('[Client Supabase Sync] system_users fetch error:', userErr);
                }

                // Fetch round_of_32, round_of_16, quarter_finals, semi_finals, grand_final, and third_place in parallel to sync matches
                try {
                  const [r32Res, r16Res, qfRes, sfRes, gfRes, tpRes] = await Promise.all([
                    supabase.from('round_of_32').select('*'),
                    supabase.from('round_of_16').select('*'),
                    supabase.from('quarter_finals').select('*'),
                    supabase.from('semi_finals').select('*'),
                    supabase.from('grand_final').select('*'),
                    supabase.from('third_place').select('*')
                  ]);

                  const dbR32Matches = r32Res.data;
                  const r32Error = r32Res.error;
                  const dbR16Matches = r16Res.data;
                  const r16Error = r16Res.error;
                  const dbQFMatches = qfRes.data;
                  const qfError = qfRes.error;
                  const dbSFMatches = sfRes.data;
                  const sfError = sfRes.error;
                  const dbGFMatches = gfRes.data;
                  const gfError = gfRes.error;
                  const dbTPMatches = tpRes.data;
                  const tpError = tpRes.error;

                  let fetchedR32Mapped: any[] = [];
                  let fetchedR16Mapped: any[] = [];
                  let fetchedQFMapped: any[] = [];
                  let fetchedSFMapped: any[] = [];
                  let fetchedGFMapped: any[] = [];
                  let fetchedTPMapped: any[] = [];

                  if (!r32Error && dbR32Matches && dbR32Matches.length > 0) {
                    fetchedR32Mapped = dbR32Matches.map((m: any) => {
                      const matchNumber = m.match_number;
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 1 - 09:00";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 1 - 09:00";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 1 - ${timeStr}`;
                        } catch (e) {
                          return "Day 1 - 09:00";
                        }
                      };

                      return {
                        id: `M${matchNumber}`,
                        label: `Match ${matchNumber}`,
                        round: 'R32' as const,
                        day: 1,
                        player1Id: m.player1_id || null,
                        player2Id: m.player2_id || null,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: m.winner_id || null,
                        loserId: m.winner_id ? (m.winner_id === m.player1_id ? m.player2_id : m.player1_id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (!r16Error && dbR16Matches && dbR16Matches.length > 0) {
                    fetchedR16Mapped = dbR16Matches.map((m: any) => {
                      const matchNumber = m.match_number;
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 2 - 10:00";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 2 - 10:00";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 2 - ${timeStr}`;
                        } catch (e) {
                          return "Day 2 - 10:00";
                        }
                      };

                      const currentPlayersList = [...dbPlayers, ...players.filter(p => !isUUID(p.id))];
                      const p1ByName = currentPlayersList.find(p => p.name === m.player1_name);
                      const p2ByName = currentPlayersList.find(p => p.name === m.player2_name);
                      const winnerByName = m.winner_name ? currentPlayersList.find(p => p.name === m.winner_name) : null;

                      const player1Id = m.player1_id || (p1ByName ? p1ByName.id : null);
                      const player2Id = m.player2_id || (p2ByName ? p2ByName.id : null);
                      const winnerId = m.winner_id || (winnerByName ? winnerByName.id : null);

                      return {
                        id: `R16-${matchNumber}`,
                        label: `R16 Match ${matchNumber}`,
                        round: 'R16' as const,
                        day: 2,
                        player1Id: player1Id,
                        player2Id: player2Id,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: winnerId,
                        loserId: winnerId ? (winnerId === player1Id ? player2Id : player1Id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (!qfError && dbQFMatches && dbQFMatches.length > 0) {
                    fetchedQFMapped = dbQFMatches.map((m: any) => {
                      const matchNumber = m.match_number;
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 2 - 14:00";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 2 - 14:00";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 2 - ${timeStr}`;
                        } catch (e) {
                          return "Day 2 - 14:00";
                        }
                      };

                      const currentPlayersList = [...dbPlayers, ...players.filter(p => !isUUID(p.id))];
                      const p1ByName = currentPlayersList.find(p => p.name === m.player1_name);
                      const p2ByName = currentPlayersList.find(p => p.name === m.player2_name);
                      const winnerByName = m.winner_name ? currentPlayersList.find(p => p.name === m.winner_name) : null;

                      const player1Id = m.player1_id || (p1ByName ? p1ByName.id : null);
                      const player2Id = m.player2_id || (p2ByName ? p2ByName.id : null);
                      const winnerId = m.winner_id || (winnerByName ? winnerByName.id : null);

                      return {
                        id: `QF-${matchNumber}`,
                        label: `QF Match ${matchNumber}`,
                        round: 'QF' as const,
                        day: 2,
                        player1Id: player1Id,
                        player2Id: player2Id,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: winnerId,
                        loserId: winnerId ? (winnerId === player1Id ? player2Id : player1Id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (!sfError && dbSFMatches && dbSFMatches.length > 0) {
                    fetchedSFMapped = dbSFMatches.map((m: any) => {
                      const matchNumber = m.match_number;
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 3 - 14:00";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 3 - 14:00";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 3 - ${timeStr}`;
                        } catch (e) {
                          return "Day 3 - 14:00";
                        }
                      };

                      const currentPlayersList = [...dbPlayers, ...players.filter(p => !isUUID(p.id))];
                      const p1ByName = currentPlayersList.find(p => p.name === m.player1_name);
                      const p2ByName = currentPlayersList.find(p => p.name === m.player2_name);
                      const winnerByName = m.winner_name ? currentPlayersList.find(p => p.name === m.winner_name) : null;

                      const player1Id = m.player1_id || (p1ByName ? p1ByName.id : null);
                      const player2Id = m.player2_id || (p2ByName ? p2ByName.id : null);
                      const winnerId = m.winner_id || (winnerByName ? winnerByName.id : null);

                      return {
                        id: `SF-${matchNumber}`,
                        label: `SF Match ${matchNumber}`,
                        round: 'SF' as const,
                        day: 3,
                        player1Id: player1Id,
                        player2Id: player2Id,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: winnerId,
                        loserId: winnerId ? (winnerId === player1Id ? player2Id : player1Id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (!gfError && dbGFMatches && dbGFMatches.length > 0) {
                    fetchedGFMapped = dbGFMatches.map((m: any) => {
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 3 - 19:00";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 3 - 19:00";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 3 - ${timeStr}`;
                        } catch (e) {
                          return "Day 3 - 19:00";
                        }
                      };

                      const currentPlayersList = [...dbPlayers, ...players.filter(p => !isUUID(p.id))];
                      const p1ByName = currentPlayersList.find(p => p.name === m.player1_name);
                      const p2ByName = currentPlayersList.find(p => p.name === m.player2_name);
                      const winnerByName = m.winner_name ? currentPlayersList.find(p => p.name === m.winner_name) : null;

                      const player1Id = m.player1_id || (p1ByName ? p1ByName.id : null);
                      const player2Id = m.player2_id || (p2ByName ? p2ByName.id : null);
                      const winnerId = m.winner_id || (winnerByName ? winnerByName.id : null);

                      return {
                        id: 'FINAL',
                        label: 'Grand Final',
                        round: 'F' as const,
                        day: 3,
                        player1Id: player1Id,
                        player2Id: player2Id,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: winnerId,
                        loserId: winnerId ? (winnerId === player1Id ? player2Id : player1Id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (!tpError && dbTPMatches && dbTPMatches.length > 0) {
                    fetchedTPMapped = dbTPMatches.map((m: any) => {
                      const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                      
                      const fmtScheduledTime = (scheduledTimeIso: string, config: any) => {
                        if (!scheduledTimeIso) return "Day 3 - 15:30";
                        if (scheduledTimeIso.includes(' - ')) return scheduledTimeIso;
                        try {
                          const d = new Date(scheduledTimeIso);
                          if (isNaN(d.getTime())) return "Day 3 - 15:30";
                          
                          const hh = String(d.getHours()).padStart(2, '0');
                          const mm = String(d.getMinutes()).padStart(2, '0');
                          const timeStr = `${hh}:${mm}`;

                          const startStr = config?.dateRange?.split(' to ')[0];
                          if (startStr) {
                            const start = new Date(startStr);
                            if (!isNaN(start.getTime())) {
                              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diffTime = dDay.getTime() - startDay.getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const dayNum = Math.max(1, diffDays + 1);
                              return `Day ${dayNum} - ${timeStr}`;
                            }
                          }
                          return `Day 3 - ${timeStr}`;
                        } catch (e) {
                          return "Day 3 - 15:30";
                        }
                      };

                      const currentPlayersList = [...dbPlayers, ...players.filter(p => !isUUID(p.id))];
                      const p1ByName = currentPlayersList.find(p => p.name === m.player1_name);
                      const p2ByName = currentPlayersList.find(p => p.name === m.player2_name);
                      const winnerByName = m.winner_name ? currentPlayersList.find(p => p.name === m.winner_name) : null;

                      const player1Id = m.player1_id || (p1ByName ? p1ByName.id : null);
                      const player2Id = m.player2_id || (p2ByName ? p2ByName.id : null);
                      const winnerId = m.winner_id || (winnerByName ? winnerByName.id : null);

                      return {
                        id: '3RD-1',
                        label: '3rd Place Match',
                        round: '3RD' as const,
                        day: 3,
                        player1Id: player1Id,
                        player2Id: player2Id,
                        score1: m.player1_score !== null && m.player1_score !== undefined ? Number(m.player1_score) : null,
                        score2: m.player2_score !== null && m.player2_score !== undefined ? Number(m.player2_score) : null,
                        points1: null,
                        points2: null,
                        break1: m.player1_highest_break !== null && m.player1_highest_break !== undefined ? Number(m.player1_highest_break) : null,
                        break2: m.player2_highest_break !== null && m.player2_highest_break !== undefined ? Number(m.player2_highest_break) : null,
                        frames: [
                          { player1Points: Number(m.player1_set1 || 0), player2Points: Number(m.player2_set1 || 0) },
                          { player1Points: Number(m.player1_set2 || 0), player2Points: Number(m.player2_set2 || 0) },
                          { player1Points: Number(m.player1_set3 || 0), player2Points: Number(m.player2_set3 || 0) }
                        ],
                        winnerId: winnerId,
                        loserId: winnerId ? (winnerId === player1Id ? player2Id : player1Id) : null,
                        status: statusStr as 'scheduled' | 'playing' | 'completed',
                        scheduledTime: fmtScheduledTime(m.scheduled_time, tournamentConfig)
                      };
                    });
                  }

                  if (
                    fetchedR32Mapped.length > 0 ||
                    fetchedR16Mapped.length > 0 ||
                    fetchedQFMapped.length > 0 ||
                    fetchedSFMapped.length > 0 ||
                    fetchedGFMapped.length > 0 ||
                    fetchedTPMapped.length > 0
                  ) {
                    setMatches((prev) => {
                      let updated = [...prev];
                      if (fetchedR32Mapped.length > 0) {
                        updated = updated.filter((m: any) => m.round !== 'R32' && !m.id.startsWith('M'));
                        updated = [...fetchedR32Mapped, ...updated];
                      }
                      if (fetchedR16Mapped.length > 0) {
                        updated = updated.filter((m: any) => m.round !== 'R16' && !m.id.startsWith('R16-'));
                        updated = [...fetchedR16Mapped, ...updated];
                      }
                      if (fetchedQFMapped.length > 0) {
                        updated = updated.filter((m: any) => m.round !== 'QF' && !m.id.startsWith('QF-'));
                        updated = [...fetchedQFMapped, ...updated];
                      }
                      if (fetchedSFMapped.length > 0) {
                        updated = updated.filter((m: any) => m.round !== 'SF' && !m.id.startsWith('SF-'));
                        updated = [...fetchedSFMapped, ...updated];
                      }
                      if (fetchedGFMapped.length > 0) {
                        updated = updated.filter((m: any) => m.id !== 'FINAL' && m.round !== 'F');
                        updated = [...fetchedGFMapped, ...updated];
                      }
                      if (fetchedTPMapped.length > 0) {
                        updated = updated.filter((m: any) => m.id !== '3RD-1' && m.round !== '3RD');
                        updated = [...fetchedTPMapped, ...updated];
                      }
                      if (JSON.stringify(prev) !== JSON.stringify(updated)) {
                        safeStorage.setItem('snooker_matches', JSON.stringify(updated));
                        return updated;
                      }
                      return prev;
                    });
                  }
                } catch (parallelErr) {
                  console.log('[Client Supabase] Parallel round sync error:', parallelErr);
                }
              } catch (dbErr) {
                console.log('[Client Supabase] DB sync notice:', dbErr);
              }
            }
          }
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
        console.log('Polling sync notice:', err);
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
    started: boolean,
    options?: { wipeBoard?: boolean; endTournament?: boolean }
  ) => {
    safeStorage.setItem('snooker_matches', JSON.stringify(newMatches));
    safeStorage.setItem('snooker_started', JSON.stringify(started));
    saveStateToServer({ players: newPlayers, matches: newMatches, isTournamentStarted: started, wipeBoard: options?.wipeBoard, endTournament: options?.endTournament });
  };

  // RBAC Action handlers
  const handleUpdateConfig = (newConfig: TournamentConfig) => {
    setTournamentConfig(newConfig);
    safeStorage.setItem('snooker_config', JSON.stringify(newConfig));
    saveStateToServer({ tournamentConfig: newConfig });
  };

  const handleUpdateUsers = (newUsers: SystemUser[]) => {
    setSystemUsers(newUsers);
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
  const handleStartTournament = async () => {
    let activePlayers = [...players];
    const supabase = getSupabase();

    if (supabase) {
      try {
        // Fetch players directly from Supabase players table
        const { data: dbPlayers, error: playersErr } = await supabase
          .from('players')
          .select('*');

        // Fetch profiles table to get matching profile information for name, nickname, club, seed, photo, etc.
        const { data: dbProfiles } = await supabase
          .from('profiles')
          .select('*');

        if (!playersErr && dbPlayers && dbPlayers.length > 0) {
          const mappedDbPlayers = dbPlayers.map((pt: any) => {
            const matchingProfile = dbProfiles?.find((profile: any) => profile.id === pt.profile_id);
            return {
              id: pt.profile_id || pt.id,
              name: (matchingProfile ? matchingProfile.full_name : '') || pt.player_name || pt.name || 'Tournament Player',
              nickname: pt.nickname || (matchingProfile ? matchingProfile.nickname : '') || '',
              club: pt.club || (matchingProfile ? matchingProfile.club : '') || '',
              seed: pt.seed !== undefined && pt.seed !== null ? Number(pt.seed) : (matchingProfile && matchingProfile.seed !== undefined && matchingProfile.seed !== null ? Number(matchingProfile.seed) : 1),
              photoUrl: pt.photo_url || pt.photoUrl || (matchingProfile ? matchingProfile.photo_url : '') || '',
              matchesPlayed: pt.matches_played !== undefined && pt.matches_played !== null ? Number(pt.matches_played) : 0,
              matchesWon: pt.matches_won !== undefined && pt.matches_won !== null ? Number(pt.matches_won) : 0,
              totalPoints: pt.total_points !== undefined && pt.total_points !== null ? Number(pt.total_points) : 0,
              highestBreak: pt.highest_break !== undefined && pt.highest_break !== null ? Number(pt.highest_break) : 0,
              status: pt.status || 'active',
              tournamentType: pt.tournament_type || ''
            };
          });

          if (mappedDbPlayers.length > 0) {
            activePlayers = mappedDbPlayers;
            // Also update React state so the UI stays synced with the database
            setPlayers(mappedDbPlayers);
          }
        }
      } catch (err: any) {
        console.warn('Could not load live players on bracket initialization:', err);
      }
    }

    if (activePlayers.length < tournamentConfig.playersCount) {
      showToast(`Please register at least ${tournamentConfig.playersCount} players to commence! (Currently: ${activePlayers.length})`, 'error');
      return;
    }

    // Slice players to configured bracket size based on seed order
    const sortedActivePlayers = [...activePlayers]
      .sort((a, b) => a.seed - b.seed)
      .slice(0, tournamentConfig.playersCount);

    // Create the scheduled matches list depending on configured playersCount
    let matchesToSet: Match[] = [];
    if (tournamentConfig.formatType === 'group' && tournamentConfig.groups) {
      matchesToSet = generateGroupFixtures(tournamentConfig.groups);
    } else {
      matchesToSet = createInitialMatches(sortedActivePlayers, tournamentConfig.playersCount);
    }
    
    setMatches(matchesToSet);
    setIsTournamentStarted(true);
    setActiveTab('bracket');

    // Save state to local storage & server (which also triggers the saveStateToServer Supabase sync)
    saveStateToStorage(activePlayers, matchesToSet, true);

    // Direct database write to round_of_32 and round_of_16 for the initialized bracket matches to ensure complete instant population
    if (supabase) {
      try {
        // Also update 'Round of 32' to 'active' status in the 'rounds' table
        const { error: roundUpdateErr } = await supabase
          .from('rounds')
          .update({ status: 'active' })
          .eq('stage', 'Round of 32');
        if (roundUpdateErr) {
          console.error('[Supabase rounds initialization] Update error:', roundUpdateErr.message);
        } else {
          console.log('[Supabase rounds initialization] Set Round of 32 to active');
          setRounds(prev => prev.map(r => r.stage === 'Round of 32' ? { ...r, status: 'active' } : r));
        }

        // Initialize round_of_32 if there are R32 matches
        const r32Matches = matchesToSet.filter((m: any) => m.round === 'R32' || m.id.startsWith('M'));
        if (r32Matches.length > 0) {
          // Clear table first to start fresh
          await supabase
            .from('round_of_32')
            .delete()
            .neq('match_number', 0);

          const rowsToInsert = r32Matches.map((m: any) => {
            const matchNumStr = m.id.replace(/\D/g, ''); // Extract digits
            const matchNumber = parseInt(matchNumStr, 10);
            if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 16) {
              return null;
            }

            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: matchNumber,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 1),
              table_number: m.table_number || matchNumber,
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (rowsToInsert.length > 0) {
            const { error: insertErr } = await supabase
              .from('round_of_32')
              .upsert(rowsToInsert, { onConflict: 'match_number' });

            if (insertErr) {
              console.error('[Supabase round_of_32 Initial Sync] Insert error:', insertErr.message);
            } else {
              console.log('[Supabase round_of_32 Initial Sync] Successfully populated round_of_32 with initial bracket matches');
              showToast('Populated Round of 32 database table with matches!', 'success');
            }
          }
        }

        // Initialize round_of_16 if there are R16 matches
        const r16Matches = matchesToSet.filter((m: any) => m.round === 'R16' || m.id.startsWith('R16-'));
        if (r16Matches.length > 0) {
          // Clear table first to start fresh
          await supabase
            .from('round_of_16')
            .delete()
            .neq('match_number', 0);

          const r16RowsToInsert = r16Matches.map((m: any) => {
            const matchNumber = m.id.includes('-') 
              ? parseInt(m.id.split('-').pop() || '', 10) 
              : parseInt(m.id.replace(/\D/g, ''), 10);
            if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 8) {
              return null;
            }

            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: matchNumber,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 2),
              table_number: m.table_number || (matchNumber + 16),
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (r16RowsToInsert.length > 0) {
            const { error: insertR16Err } = await supabase
              .from('round_of_16')
              .upsert(r16RowsToInsert, { onConflict: 'match_number' });

            if (insertR16Err) {
              console.error('[Supabase round_of_16 Initial Sync] Insert error:', insertR16Err.message);
            } else {
              console.log('[Supabase round_of_16 Initial Sync] Successfully populated round_of_16 with initial bracket matches');
            }
          }
        }

        // Initialize quarter_finals if there are QF matches
        const qfMatches = matchesToSet.filter((m: any) => m.round === 'QF' || m.id.startsWith('QF-'));
        if (qfMatches.length > 0) {
          // Clear table first to start fresh
          await supabase
            .from('quarter_finals')
            .delete()
            .neq('match_number', 0);

          const qfRowsToInsert = qfMatches.map((m: any) => {
            const matchNumber = m.id.includes('-') 
              ? parseInt(m.id.split('-').pop() || '', 10) 
              : parseInt(m.id.replace(/\D/g, ''), 10);
            if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 4) {
              return null;
            }

            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: matchNumber,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 2),
              table_number: m.table_number || (matchNumber + 24),
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (qfRowsToInsert.length > 0) {
            const { error: insertQFErr } = await supabase
              .from('quarter_finals')
              .upsert(qfRowsToInsert, { onConflict: 'match_number' });

            if (insertQFErr) {
              console.error('[Supabase quarter_finals Initial Sync] Insert error:', insertQFErr.message);
            } else {
              console.log('[Supabase quarter_finals Initial Sync] Successfully populated quarter_finals with initial bracket matches');
            }
          }
        }

        // Initialize semi_finals if there are SF matches
        const sfMatches = matchesToSet.filter((m: any) => m.round === 'SF' || m.id.startsWith('SF-'));
        if (sfMatches.length > 0) {
          // Clear table first to start fresh
          await supabase
            .from('semi_finals')
            .delete()
            .neq('match_number', 0);

          const sfRowsToInsert = sfMatches.map((m: any) => {
            const matchNumber = m.id.includes('-') 
              ? parseInt(m.id.split('-').pop() || '', 10) 
              : parseInt(m.id.replace(/\D/g, ''), 10);
            if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 2) {
              return null;
            }

            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: matchNumber,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
              table_number: m.table_number || (matchNumber + 28),
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (sfRowsToInsert.length > 0) {
            const { error: insertSFErr } = await supabase
              .from('semi_finals')
              .upsert(sfRowsToInsert, { onConflict: 'match_number' });

            if (insertSFErr) {
              console.error('[Supabase semi_finals Initial Sync] Insert error:', insertSFErr.message);
            } else {
              console.log('[Supabase semi_finals Initial Sync] Successfully populated semi_finals with initial bracket matches');
            }
          }
        }

        // Initialize grand_final if there are GF matches
        const gfMatches = matchesToSet.filter((m: any) => m.id === 'FINAL' || m.round === 'F');
        if (gfMatches.length > 0) {
          await supabase
            .from('grand_final')
            .delete()
            .neq('match_number', 0);

          const gfRowsToInsert = gfMatches.map((m: any) => {
            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: 1,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
              table_number: m.table_number || 1,
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (gfRowsToInsert.length > 0) {
            const { error: insertGFErr } = await supabase
              .from('grand_final')
              .upsert(gfRowsToInsert, { onConflict: 'match_number' });

            if (insertGFErr) {
              console.error('[Supabase grand_final Initial Sync] Insert error:', insertGFErr.message);
            } else {
              console.log('[Supabase grand_final Initial Sync] Successfully populated grand_final with initial match');
            }
          }
        }

        // Initialize third_place if there are TP matches
        const tpMatches = matchesToSet.filter((m: any) => m.id === '3RD-1' || m.round === '3RD');
        if (tpMatches.length > 0) {
          await supabase
            .from('third_place')
            .delete()
            .neq('match_number', 0);

          const tpRowsToInsert = tpMatches.map((m: any) => {
            const p1 = activePlayers.find(p => p.id === m.player1Id);
            const p2 = activePlayers.find(p => p.id === m.player2Id);
            const p1Name = p1 ? p1.name : 'TBD';
            const p2Name = p2 ? p2.name : 'TBD';

            return {
              match_number: 1,
              player1_id: isUUID(m.player1Id) ? m.player1Id : null,
              player2_id: isUUID(m.player2Id) ? m.player2Id : null,
              player1_name: p1Name,
              player2_name: p2Name,
              player1_score: m.score1 !== null && m.score1 !== undefined ? Number(m.score1) : 0,
              player2_score: m.score2 !== null && m.score2 !== undefined ? Number(m.score2) : 0,
              player1_set1: m.frames && m.frames[0] ? Number(m.frames[0].player1Points || 0) : 0,
              player1_set2: m.frames && m.frames[1] ? Number(m.frames[1].player1Points || 0) : 0,
              player1_set3: m.frames && m.frames[2] ? Number(m.frames[2].player1Points || 0) : 0,
              player2_set1: m.frames && m.frames[0] ? Number(m.frames[0].player2Points || 0) : 0,
              player2_set2: m.frames && m.frames[1] ? Number(m.frames[1].player2Points || 0) : 0,
              player2_set3: m.frames && m.frames[2] ? Number(m.frames[2].player2Points || 0) : 0,
              player1_highest_break: m.break1 !== null && m.break1 !== undefined ? Number(m.break1) : 0,
              player2_highest_break: m.break2 !== null && m.break2 !== undefined ? Number(m.break2) : 0,
              winner_id: isUUID(m.winnerId) ? m.winnerId : null,
              winner_name: m.winnerId ? (activePlayers.find(p => p.id === m.winnerId)?.name || null) : null,
              status: m.status === 'playing' ? 'ongoing' : (m.status === 'completed' ? 'completed' : 'scheduled'),
              scheduled_time: safeIsoString(m.scheduledTime, m.day || 3),
              table_number: m.table_number || 2,
              referee_name: m.referee_name || null,
              tournament_type: m.tournament_type || 'Snooker'
            };
          }).filter(Boolean);

          if (tpRowsToInsert.length > 0) {
            const { error: insertTPErr } = await supabase
              .from('third_place')
              .upsert(tpRowsToInsert, { onConflict: 'match_number' });

            if (insertTPErr) {
              console.error('[Supabase third_place Initial Sync] Insert error:', insertTPErr.message);
            } else {
              console.log('[Supabase third_place Initial Sync] Successfully populated third_place with initial match');
            }
          }
        }
      } catch (err: any) {
        console.error('Error during bracket DB initial population:', err);
      }
    }
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
  const handleEndTournament = () => {
    if (!hasPermission('editSettings') && !hasPermission('scoreMatches')) {
      showToast('Your current role does not have authorization to end the tournament.', 'error');
      return;
    }
    setShowEndConfirm(true);
  };

  const handleConfirmEndTournament = () => {
    setShowEndConfirm(false);
    const supabase = getSupabase();
    if (supabase) {
      supabase
        .from('rounds')
        .update({ status: 'not started' })
        .neq('status', 'not started')
        .then(({ error }) => {
          if (error) {
            console.error('[Supabase rounds termination] Update error:', error.message);
          } else {
            console.log('[Supabase rounds termination] Reverted rounds to not started');
            setRounds(prev => prev.map(r => ({ ...r, status: 'not started' })));
          }
        });

      // Reset all profiles whose status is not pending back to pending, and set seed to NULL
      supabase
        .from('profiles')
        .update({ status: 'pending', seed: null })
        .neq('status', 'pending')
        .then(({ error }) => {
          if (error) {
            console.error('[Supabase profiles termination] Update error:', error.message);
          } else {
            console.log('[Supabase profiles termination] Reset all non-pending profiles to pending with NULL seed');
          }
        });
    }
    setRounds(prev => prev.map(r => ({ ...r, status: 'not started' })));

    // Reset players tournament stats
    const resetPlayers = players.map(p => ({
      ...p,
      matchesPlayed: 0,
      matchesWon: 0,
      totalPoints: 0,
      highestBreak: 0,
      status: 'approved' as const
    }));

    setPlayers(resetPlayers);
    setMatches([]);
    setIsTournamentStarted(false);
    setActiveTab('info');

    saveStateToStorage(resetPlayers, [], false, { endTournament: true });
    showToast('The tournament has been ended. All active games are ended, and fixtures have been reverted to empty.', 'success');
  };

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
        first: '₦500,000',
        second: '₦150,000',
      },
      tournamentTypes: ['Soccer', 'Snooker', 'Table Tennis'],
      selectedTournamentType: 'Snooker'
    };
    setTournamentConfig(defaultConfig);
    
    const defaultUsers: SystemUser[] = [];
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
      publicRegistrationEnabled: true,
      wipePlayersAndAuthUsers: true
    });

    setShowWipeConfirm(false);
    showToast('All system configurations, match histories, and roles have been wiped.', 'success');
  };

  const handlePlayersChange = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
    if (newPlayers.length === 0) {
      saveStateToStorage(newPlayers, matches, isTournamentStarted, { wipeBoard: true });
    } else {
      saveStateToStorage(newPlayers, matches, isTournamentStarted);
    }
  };

  const handleApplicationsChange = (newApps: PlayerApplication[]) => {
    setPlayerApplications(newApps);
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
        <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-bg-secondary border border-rose-500/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif font-bold text-xl uppercase tracking-wider">Registration Closed</h2>
              <p className="text-xs text-text-muted">
                The public player registration portal for <span className="text-[#D4AF37] font-semibold">{tournamentConfig.tournamentName}</span> is currently closed or has concluded.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  window.location.search = '';
                }}
                className="w-full bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary font-bold text-xs py-3 rounded-xl transition-all border border-rose-500/10 cursor-pointer"
              >
                Go to Tournament Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleSubmitApplication = async (app: Omit<PlayerApplication, 'id' | 'status' | 'appliedAt'>) => {
      let isSyncedWithSupabase = false;
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        });
        if (res.ok) {
          isSyncedWithSupabase = true;
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
        console.log('Application submission notice:', e);
      }

      // If server submission failed (404/Netlify/Offline) and client-side Supabase is configured
      const supabase = getSupabase();
      if (!isSyncedWithSupabase && supabase) {
        try {
          // Generate a unique dummy email for this registration record
          const cleanName = app.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player';
          const userEmail = app.email || `${cleanName}-${Date.now()}@example.com`;
          const userPassword = `PlayerPass123_Secure!`;

          console.log('[Client Supabase Sync] Registering user:', userEmail);

          // 1. Sign up the user via Supabase Auth
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userEmail,
            password: userPassword,
            options: {
              data: {
                full_name: app.fullName || "",
                nickname: app.nickname || "",
                club: app.club || "",
                phone_number: app.phoneNumber || "",
                whatsapp_number: app.whatsappNumber || "",
                social_media_page: app.socialMediaPage || "",
                document_name: app.documentName || "",
              }
            }
          });

          if (signUpError) {
            console.log('[Client Supabase] SignUp notice:', signUpError.message);
          }

          const targetUserId = signUpData?.user?.id;
          if (targetUserId) {
            let finalPhotoUrl = app.photoUrl;
            let finalDocumentUrl = app.documentUrl;

            // Helper to convert base64 to Blob
            const base64ToBlob = (base64String: string) => {
              if (!base64String || !base64String.startsWith('data:')) return null;
              const parts = base64String.split(',');
              if (parts.length < 2) return null;
              const metadata = parts[0];
              const base64Data = parts[1];
              const contentTypeMatch = metadata.match(/data:([^;]+);/);
              const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
              
              let binary: string;
              if (metadata.includes('base64')) {
                binary = atob(base64Data);
              } else {
                binary = decodeURIComponent(base64Data);
              }
              const len = binary.length;
              const buffer = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                buffer[i] = binary.charCodeAt(i);
              }
              return { blob: new Blob([buffer], { type: contentType }), contentType };
            };

            const uploadToBucketWithFallbacks = async (
              preferredBucket: string,
              fileName: string,
              fileBlob: Blob,
              contentType: string
            ): Promise<string | null> => {
              // Try the exact bucket name, kebab-case, and snake-case variations to match whatever was manually created
              const bucketCandidates = [
                preferredBucket,
                preferredBucket.replace(/\s+/g, '-'),
                preferredBucket.replace(/\s+/g, '_')
              ];

              for (const bucketId of bucketCandidates) {
                try {
                  console.log(`[Client Storage Upload] Trying bucket ID: "${bucketId}"`);
                  const fileToUpload = new File([fileBlob], fileName, { type: contentType });
                  
                  const { data, error } = await supabase.storage
                    .from(bucketId)
                    .upload(fileName, fileToUpload, { contentType, upsert: true });

                  if (!error && data) {
                    const { data: { publicUrl } } = supabase.storage.from(bucketId).getPublicUrl(fileName);
                    console.log(`[Client Storage Upload] Success for bucket "${bucketId}":`, publicUrl);
                    return publicUrl;
                  } else if (error) {
                    console.warn(`[Client Storage Upload] Bucket "${bucketId}" error:`, error.message);
                  }
                } catch (err: any) {
                  console.error(`[Client Storage Upload] Bucket "${bucketId}" exception:`, err?.message || err);
                }
              }
              return null;
            };

            // Upload photo to Supabase storage if it's base64 data
            if (app.photoUrl && app.photoUrl.startsWith('data:')) {
              try {
                const fileRes = base64ToBlob(app.photoUrl);
                if (fileRes) {
                  const ext = fileRes.contentType.split('/')[1] || 'png';
                  const fileName = `${targetUserId}_photo_${Date.now()}.${ext}`;
                  const uploadedUrl = await uploadToBucketWithFallbacks(
                    'player photos',
                    fileName,
                    fileRes.blob,
                    fileRes.contentType
                  );
                  if (uploadedUrl) {
                    finalPhotoUrl = uploadedUrl;
                  }
                }
              } catch (photoErr) {
                console.log('[Client Supabase] Photo upload issue:', photoErr);
              }
            }

            // Upload verification document to Supabase storage if it's base64 data
            if (app.documentUrl && app.documentUrl.startsWith('data:')) {
              try {
                const fileRes = base64ToBlob(app.documentUrl);
                if (fileRes) {
                  const ext = app.documentName?.split('.').pop() || fileRes.contentType.split('/')[1] || 'pdf';
                  const fileName = `${targetUserId}_document_${Date.now()}.${ext}`;
                  const uploadedUrl = await uploadToBucketWithFallbacks(
                    'player documents',
                    fileName,
                    fileRes.blob,
                    fileRes.contentType
                  );
                  if (uploadedUrl) {
                    finalDocumentUrl = uploadedUrl;
                  }
                }
              } catch (docErr) {
                console.log('[Client Supabase] Document upload issue:', docErr);
              }
            }

            // Direct profile table upsert with the storage URLs
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert({
                id: targetUserId,
                full_name: app.fullName || "",
                nickname: app.nickname || null,
                club: app.club || null,
                phone_number: app.phoneNumber || null,
                whatsapp_number: app.whatsappNumber || null,
                social_media_page: app.socialMediaPage || null,
                photo_url: finalPhotoUrl || null,
                document_url: finalDocumentUrl || null,
                document_name: app.documentName || null,
                tournament_type: app.tournamentType || null,
                status: 'pending'
              });

            if (upsertError) {
              console.log('[Client Supabase] Profiles upsert notice:', upsertError.message);
            } else {
              console.log('[Client Supabase Sync Success] Application fully registered and synced.');
              isSyncedWithSupabase = true;

              // Force update frontend profiles list instantly
              const { data: dbProfiles } = await supabase.from('profiles').select('*');
              if (dbProfiles) {
                const mappedApps = dbProfiles.map((p: any) => ({
                  id: p.id,
                  fullName: p.full_name || '',
                  nickname: p.nickname || '',
                  club: p.club || '',
                  phoneNumber: p.phone_number || '',
                  whatsappNumber: p.whatsapp_number || '',
                  socialMediaPage: p.social_media_page || '',
                  photoUrl: p.photo_url || '',
                  documentUrl: p.document_url || '',
                  documentName: p.document_name || '',
                  status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
                  appliedAt: p.created_at || p.applied_at || new Date().toISOString(),
                  tournamentType: p.tournament_type || ''
                }));
                setPlayerApplications(mappedApps);
                return;
              }
            }
          }
        } catch (err: any) {
          console.log('[Client Supabase] Operation details:', err?.message || err);
        }
      }

      // Local Fallback
      const newApp: PlayerApplication = {
        ...app,
        id: `app-${Date.now()}`,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };
      
      const updated = [...playerApplications, newApp];
      handleApplicationsChange(updated);
    };

    return (
      <PlayerApplicationForm
        tournamentName={tournamentConfig.tournamentName}
        onSubmitApplication={handleSubmitApplication}
        systemLogo={systemLogo}
        tournamentTypes={tournamentConfig.tournamentTypes}
        selectedTournamentType={tournamentConfig.selectedTournamentType}
      />
    );
  }

  if (!currentUser) {
    if (!showMainLogin) {
      return (
        <MainLandingPage
          onNavigateToLogin={() => setShowMainLogin(true)}
          systemLogo={systemLogo}
          tournamentName={tournamentConfig.tournamentName}
        />
      );
    }

    return (
      <LoginPage
        users={systemUsers}
        onLogin={handleLogin}
        tournamentConfig={tournamentConfig}
        theme={theme}
        setTheme={setTheme}
        systemLogo={systemLogo}
        onBackToHome={() => setShowMainLogin(false)}
        isSupabaseSuspended={isSupabaseSuspended}
      />
    );
  }

  const isEndActive = rounds.some(r => r.status !== 'not started');
  const effectiveTournamentStarted = isTournamentStarted || isEndActive;
  const isMaximizedFullBracket = activeTab === 'bracket' && bracketView === 'full' && effectiveTournamentStarted && tournamentConfig.formatType !== 'group';

  return (
    <div className="min-h-screen flex bg-bg-primary text-text-primary w-full">
      {!isMaximizedFullBracket && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isTabAllowed={isTabAllowed} 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
          systemLogo={systemLogo}
        />
      )}
      
      <div className={`flex-1 transition-all duration-300 ${isMaximizedFullBracket ? 'ml-0' : isSidebarCollapsed ? 'ml-0 md:ml-24' : 'ml-0 md:ml-72'} pb-20 md:pb-0`}>
        {/* Premium Luxury Header Bar */}
        {!isMaximizedFullBracket && (
          <header className="bg-bg-secondary border-b border-[#1A2740] py-4 px-4 md:px-8 sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 shrink-0">
              <img 
                src={systemLogo || "https://fmbwnbvhvcuihzifiajk.supabase.co/storage/v1/object/public/website_logo/46.png"} 
                alt="Logo" 
                className="w-full h-full object-contain rounded-xl sm:rounded-2xl border border-rose-500/20 p-1 bg-bg-primary shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] sm:text-[11px] font-sans font-black text-rose-500 tracking-[0.2em] uppercase">
                    CLASS 46
                  </span>
                  <h1 className="font-sans font-black text-sm sm:text-base md:text-xl text-text-primary tracking-[0.05em] uppercase leading-tight truncate">
                    SNOOKER CHAMPIONSHIP
                  </h1>
                </div>
                <span className="text-[8px] sm:text-[9px] font-sans font-extrabold bg-rose-500/10 text-rose-500 px-2 sm:px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-widest whitespace-nowrap">
                  {tournamentConfig.playersCount} PLAYERS
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] text-text-muted mt-1 font-medium text-left">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  {tournamentConfig.dateRange}
                </span>
                <span className="text-rose-500/30 hidden sm:inline">|</span>
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Venue: <span className="text-text-primary font-black uppercase">{tournamentConfig.venue}</span></span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Simulation, resets, theme toggle) */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* User Session Info & Log Out */}
            {currentUser && (
              <div className="flex items-center gap-3 bg-bg-primary border border-rose-500/20 px-4 py-1.5 rounded-xl text-xs shadow-[0_0_15px_rgba(225,29,72,0.05)] transition-all">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <span className="text-rose-500 font-bold text-xs">👤</span>
                </div>
                <div className="flex flex-col text-left leading-tight pr-1">
                  <span className="font-black text-text-primary">{currentUser.username}</span>
                  <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black">{currentUser.role}</span>
                </div>
                <div className="h-6 w-[1px] bg-rose-500/15" />
                <button
                  onClick={() => handleLogin(null)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
              className="flex items-center justify-center p-2.5 rounded-xl bg-bg-primary border border-rose-500/10 text-text-muted hover:text-rose-500 hover:border-rose-500/30 transition-all cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {effectiveTournamentStarted && (
              <button
                onClick={handleAutoSimulateAllReady}
                id="btn-auto-simulate-round"
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                title="Autofills and advances matches for the currently ready brackets"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Fast Sim
              </button>
            )}

            <button
              onClick={handleEndTournament}
              disabled={!effectiveTournamentStarted}
              id="btn-end-tournament"
              className={`flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-xl transition-colors uppercase tracking-wider ${
                effectiveTournamentStarted
                  ? "text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.05)]"
                  : "text-amber-500/40 bg-amber-500/5 border border-amber-500/10 cursor-not-allowed opacity-50"
              }`}
              title={effectiveTournamentStarted ? "End all active games and revert fixtures to empty" : "No active tournament to end"}
            >
              <StopCircle className="w-3.5 h-3.5" /> End Tournament
            </button>

            <button
              disabled={true}
              id="btn-reset-tournament"
              className="flex items-center gap-1.5 text-xs font-extrabold text-red-500/40 bg-red-500/5 border border-red-500/10 px-3.5 py-2 rounded-xl transition-colors cursor-not-allowed opacity-50 uppercase tracking-wider"
              title="Wipe system is currently disabled"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Wipe System
            </button>
          </div>
        </div>
      </header>
      )}

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
      <main className={`flex-1 w-full mx-auto space-y-6 sm:space-y-8 ${isMaximizedFullBracket ? 'max-w-none p-2 md:p-4' : 'max-w-7xl p-2 sm:p-4 md:p-8'}`}>
        
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
              isTournamentStarted={effectiveTournamentStarted}
              playersCount={tournamentConfig.playersCount}
              applications={playerApplications}
              onApplicationsChange={handleApplicationsChange}
              config={tournamentConfig}
              rounds={rounds}
            />
          )}

          {activeTab === 'bracket' && effectiveTournamentStarted && (
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

          {activeTab === 'display' && effectiveTournamentStarted && (
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
              isTournamentStarted={effectiveTournamentStarted}
              rolePermissions={rolePermissions}
              onUpdateRolePermissions={handleUpdateRolePermissions}
              publicRegistrationEnabled={publicRegistrationEnabled}
              onPublicRegistrationEnabledChange={(val) => {
                setPublicRegistrationEnabled(val);
                saveStateToServer({ publicRegistrationEnabled: val });
              }}
              systemLogo={systemLogo}
              onUpdateSystemLogo={handleUpdateSystemLogo}
              isSupabaseSuspended={isSupabaseSuspended}
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

      {/* End Tournament Confirmation Modal Overlay */}
      <ConfirmModal
        isOpen={showEndConfirm}
        title="End Tournament"
        message="Are you sure you want to end the current tournament? This will reset all active matches, clear live results, and revert players back to an approved but unbracketed state. This action cannot be undone."
        confirmText="End Tournament"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmEndTournament}
        onCancel={() => setShowEndConfirm(false)}
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
