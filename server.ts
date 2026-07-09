import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const isUUID = (id: any): boolean => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");

interface TournamentState {
  players: any[];
  matches: any[];
  isTournamentStarted: boolean;
  rounds?: any[];
  tournamentConfig: {
    tournamentName: string;
    format: string;
    playersCount: number;
    durationDays: number;
    registrationToken?: string;
    publicPortalToken?: string;
    formatType?: string;
    venue: string;
    dateRange: string;
    setsToPlay: number;
    prizes: {
      first: string;
      second: string;
      third?: string;
      highestBreak?: string;
    };
    tournamentTypes?: string[];
    selectedTournamentType?: string;
  };
  systemUsers: any[];
  rolePermissions: any[];
  playerApplications: any[];
  publicRegistrationEnabled: boolean;
  systemLogo?: string;
  systemUsersTableMissing?: boolean;
}

const DEFAULT_STATE: TournamentState = {
  players: [],
  matches: [],
  isTournamentStarted: false,
  rounds: [
    { stage: 'Round of 32', status: 'not started' },
    { stage: 'Round of 16', status: 'not started' },
    { stage: 'Quarter finals', status: 'not started' },
    { stage: 'Semi finals', status: 'not started' },
    { stage: 'Final', status: 'not started' }
  ],
  tournamentConfig: {
    tournamentName: "CLASS 46 SNOOKER CHAMPIONSHIP",
    format: "Knockout",
    playersCount: 32,
    durationDays: 3,
    registrationToken: "a1b2c3d4e5f6",
    venue: "Class 46 Lounge",
    dateRange: "17 July to 19 July 2026",
    setsToPlay: 3,
    prizes: {
      first: "₦500,000",
      second: "₦150,000"
    }
  },
  systemUsers: [],
  rolePermissions: [
    {
      role: "Admin",
      allowedTabs: ["info", "registration", "bracket", "display", "settings"],
      allowedActions: ["scoreMatches", "userManagement", "editSettings", "quickSimulate", "wipeSystem"]
    },
    {
      role: "Owner",
      allowedTabs: ["info", "registration", "bracket", "display", "settings"],
      allowedActions: ["scoreMatches", "editSettings", "quickSimulate", "wipeSystem"]
    },
    {
      role: "Game Admin",
      allowedTabs: ["registration", "bracket", "display"],
      allowedActions: ["scoreMatches", "editSettings"]
    },
    {
      role: "Referee",
      allowedTabs: ["bracket", "display"],
      allowedActions: ["scoreMatches"]
    },
    {
      role: "Scorer",
      allowedTabs: ["bracket", "display"],
      allowedActions: ["scoreMatches"]
    },
    {
      role: "Player",
      allowedTabs: ["info", "bracket", "display"],
      allowedActions: []
    }
  ],
  playerApplications: [],
  publicRegistrationEnabled: true,
  systemLogo: "",
  systemUsersTableMissing: false
};

function readState(): TournamentState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const state = JSON.parse(content);
      let changed = false;
      if (state.tournamentConfig && state.tournamentConfig.prizes) {
        if (state.tournamentConfig.prizes.first === "₦350,000 + Certificate" || state.tournamentConfig.prizes.first === "₦500,000 + Certificate") {
          state.tournamentConfig.prizes.first = "₦500,000";
          changed = true;
        } else if (state.tournamentConfig.prizes.first === "₦350,000") {
          state.tournamentConfig.prizes.first = "₦500,000";
          changed = true;
        }
        if (state.tournamentConfig.prizes.second === "₦150,000 + Certificate") {
          state.tournamentConfig.prizes.second = "₦150,000";
          changed = true;
        }
        if ("highestBreak" in state.tournamentConfig.prizes) {
          delete state.tournamentConfig.prizes.highestBreak;
          changed = true;
        }
        if ("third" in state.tournamentConfig.prizes) {
          delete state.tournamentConfig.prizes.third;
          changed = true;
        }
      }
      if (changed) {
        writeState(state);
      }
      return state;
    }
  } catch (e) {
    console.error("Error reading data file, using defaults:", e);
  }
  return { ...DEFAULT_STATE };
}

function writeState(state: TournamentState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing data file:", e);
  }
}

// Ensure Supabase Storage bucket exists and is public
async function ensureBucketExists(supabase: any, bucketName: string) {
  try {
    console.log(`[Supabase Storage] Checking if bucket "${bucketName}" exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error(`[Supabase Storage] Error listing buckets:`, listError.message);
      return;
    }
    const exists = buckets && buckets.some((b: any) => b.name === bucketName);
    if (!exists) {
      console.log(`[Supabase Storage] Bucket "${bucketName}" not found. Creating it as a public bucket...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });
      if (createError) {
        console.error(`[Supabase Storage] Error creating bucket "${bucketName}":`, createError.message);
      } else {
        console.log(`[Supabase Storage] Successfully created public bucket "${bucketName}".`);
      }
    } else {
      console.log(`[Supabase Storage] Bucket "${bucketName}" already exists.`);
    }
  } catch (err: any) {
    console.error(`[Supabase Storage] Exception while ensuring bucket "${bucketName}" exists:`, err?.message || err);
  }
}

// Helper to decode Base64 data and upload it directly to Supabase Storage bucket
async function uploadBase64ToSupabase(
  supabase: any,
  bucketName: string,
  base64String: string,
  userId: string,
  prefix: string,
  originalName?: string
): Promise<string | null> {
  if (!base64String || !base64String.startsWith("data:")) {
    return null;
  }

  try {
    // Proactively ensure the target bucket exists before attempting upload
    await ensureBucketExists(supabase, bucketName);
    const parts = base64String.split(",");
    if (parts.length < 2) return null;

    const metadataPart = parts[0];
    const base64Data = parts[1];

    const contentTypeMatch = metadataPart.match(/data:([^;]+);/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream";

    // Determine extension
    let ext = "bin";
    if (originalName && originalName.includes(".")) {
      ext = originalName.split(".").pop() || "bin";
    } else {
      const mimeToExt: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/svg+xml": "svg",
        "application/pdf": "pdf",
      };
      ext = mimeToExt[contentType] || "bin";
    }

    let buffer: Buffer;
    if (metadataPart.includes("base64")) {
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.from(decodeURIComponent(base64Data), "utf-8");
    }
    const fileName = `${userId}_${prefix}_${Date.now()}.${ext}`;

    // Upload to bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`[Supabase Storage Upload Error to ${bucketName}]:`, error.message);
      // Try matching with spaces replaced by underscores or hyphens in case of bucket name naming variations
      const fallbackBuckets = [bucketName.replace(" ", "_"), bucketName.replace(" ", "-")];
      for (const fallbackBucket of fallbackBuckets) {
        if (fallbackBucket !== bucketName) {
          console.log(`[Supabase Storage] Retrying upload with fallback bucket name: ${fallbackBucket}`);
          const { data: fbData, error: fbError } = await supabase.storage
            .from(fallbackBucket)
            .upload(fileName, buffer, {
              contentType,
              upsert: true,
            });
          if (!fbError && fbData) {
            const { data: { publicUrl } } = supabase.storage.from(fallbackBucket).getPublicUrl(fileName);
            return publicUrl;
          } else if (fbError) {
            console.error(`[Supabase Storage Fallback Error for ${fallbackBucket}]:`, fbError.message);
          }
        }
      }
      return null;
    }

    if (data) {
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return publicUrl;
    }
  } catch (err: any) {
    console.error(`[Supabase Storage Upload Exception to ${bucketName}]:`, err?.message || err);
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  // Log Supabase configuration on boot
  console.log("\n=======================================================");
  console.log("   SNOOKER CHAMPIONSHIP BACKEND INITIALIZATION");
  console.log("=======================================================");
  const bootSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const bootServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const bootSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  console.log(`- Supabase URL:       ${bootSupabaseUrl && bootSupabaseUrl !== "YOUR_SUPABASE_URL" ? `FOUND (${bootSupabaseUrl})` : "❌ NOT FOUND"}`);
  console.log(`- Service Role Key:   ${bootServiceRoleKey && bootServiceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY" ? "FOUND (Secret Masked)" : "❌ NOT FOUND"}`);
  console.log(`- Anon/Public Key:    ${bootSupabaseAnonKey && bootSupabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY" ? "FOUND (Secret Masked)" : "❌ NOT FOUND"}`);

  if (!bootSupabaseUrl || bootSupabaseUrl === "YOUR_SUPABASE_URL") {
    console.warn("⚠️  WARNING: Supabase connection will be SKIPPED! Set VITE_SUPABASE_URL / SUPABASE_URL.");
  } else if (!bootServiceRoleKey || bootServiceRoleKey === "YOUR_SUPABASE_SERVICE_ROLE_KEY") {
    console.warn("⚠️  WARNING: No service role key found. Server will run in read-only / limited public signup fallback mode!");
  } else {
    console.log("✅ SUCCESS: Backend has fully-authorized Admin Service Role access to Supabase.");
  }

  // Proactively ensure storage buckets are created and configured as public on startup
  if (bootSupabaseUrl && bootSupabaseUrl !== "YOUR_SUPABASE_URL") {
    const activeKey = (bootServiceRoleKey && bootServiceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY") 
      ? bootServiceRoleKey 
      : (bootSupabaseAnonKey && bootSupabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY" ? bootSupabaseAnonKey : null);
    
    if (activeKey) {
      try {
        const initSupabase = createClient(bootSupabaseUrl, activeKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        console.log("[Supabase Storage] Proactively initializing storage buckets on server boot...");
        ensureBucketExists(initSupabase, 'player photos');
        ensureBucketExists(initSupabase, 'player documents');
        ensureBucketExists(initSupabase, 'player-photos');
        ensureBucketExists(initSupabase, 'player-documents');
        ensureBucketExists(initSupabase, 'player_photos');
        ensureBucketExists(initSupabase, 'player_documents');
      } catch (err: any) {
        console.error("[Supabase Storage Init Error]:", err?.message || err);
      }
    }
  }

  console.log("=======================================================\n");

  function withTimeout<T>(promise: Promise<T>, ms: number, timeoutErrorMsg: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(timeoutErrorMsg));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timer);
    });
  }

  let lastSupabaseFetchTime = 0;
  let cachedProfiles: any[] = [];
  let cachedPlayers: any[] = [];
  let isSyncing = false;

  async function syncWithSupabase() {
    if (isSyncing) return;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
    const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

    if (!supabaseUrl || !activeKey || supabaseUrl === "YOUR_SUPABASE_URL" || activeKey === "YOUR_SUPABASE_ANON_KEY") {
      return;
    }

    isSyncing = true;
    lastSupabaseFetchTime = Date.now();
    try {
      await withTimeout((async () => {
        const supabase = createClient(supabaseUrl, activeKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        });

        console.log("[Supabase Background Sync] Fetching profiles...");
        const { data: dbProfiles, error: fetchError } = await supabase
          .from('profiles')
          .select('*');

        if (fetchError) {
          console.log('[Supabase DB Sync] Fetch profiles notice:', fetchError.message);
        } else if (dbProfiles) {
          console.log(`[Supabase DB Sync Success] Fetched ${dbProfiles.length} profiles from database.`);
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
          cachedProfiles = mappedApps;

          // Get players from players table in Supabase
          let dbPlayers: any[] = [];
          try {
            console.log("[Supabase Background Sync] Fetching players table...");
            const { data: dbPlayersTable, error: playersFetchError } = await supabase
              .from('players')
              .select('*');

            if (playersFetchError) {
              console.log('[Supabase DB Sync] Fetch players table error, falling back to profiles:', playersFetchError.message);
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
                  console.log(`[Supabase DB Sync] Auto-inserting missing player for profile ${profile.id} into players table`);
                  try {
                    const { error: insertErr } = await supabase
                      .from('players')
                      .insert({
                        profile_id: profile.id,
                        player_name: profile.full_name,
                        nickname: profile.nickname,
                        club: profile.club,
                        seed: profile.seed || 1,
                        status: profile.status === 'approved' ? 'active' : profile.status,
                        matches_played: profile.matches_played || 0,
                        matches_won: profile.matches_won || 0,
                        total_points: profile.total_points || 0,
                        highest_break: profile.highest_break || 0
                      });
                    if (insertErr) {
                      await supabase
                        .from('players')
                        .insert({
                          profile_id: profile.id,
                          name: profile.full_name,
                          nickname: profile.nickname,
                          club: profile.club,
                          seed: profile.seed || 1,
                          status: profile.status === 'approved' ? 'active' : profile.status,
                          matches_played: profile.matches_played || 0,
                          matches_won: profile.matches_won || 0,
                          total_points: profile.total_points || 0,
                          highest_break: profile.highest_break || 0
                        });
                    }
                  } catch (e) {
                    console.log(`[Supabase DB Sync] Auto-healing insert error:`, e);
                  }
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
            console.log('[Supabase DB Sync] Players table fetch error, falling back to profiles:', playerErr?.message || playerErr);
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

          cachedPlayers = dbPlayers;
          lastSupabaseFetchTime = Date.now();

          const state = readState();
          // Retain local/demo players who do not have a valid UUID or have a demo prefix
          const demoPlayers = (state.players || []).filter((p: any) => !isUUID(p.id) || p.id.startsWith('p-') || p.id.startsWith('P-'));
          state.players = [...dbPlayers, ...demoPlayers].sort((a, b) => (a.seed || 0) - (b.seed || 0));
          state.playerApplications = mappedApps;

          const { data: dbTypes, error: typesError } = await supabase
            .from('tournament_types')
            .select('*');

          if (!typesError && dbTypes && dbTypes.length > 0) {
            const typesList = dbTypes.map((t: any) => t.name);
            const activeType = dbTypes.find((t: any) => t.is_active)?.name || typesList[0] || 'Snooker';
            state.tournamentConfig.tournamentTypes = typesList;
            state.tournamentConfig.selectedTournamentType = activeType;
          }

          // Fetch rounds from Supabase to sync tournament status and rounds state
          try {
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
              state.rounds = mappedRounds;

              const anyActiveOrEnded = mappedRounds.some((r: any) => r.status !== 'not started');
              state.isTournamentStarted = anyActiveOrEnded;
              console.log(`[Supabase DB Sync] Rounds synced. Any active/ended: ${anyActiveOrEnded}. Synced isTournamentStarted to ${anyActiveOrEnded}`);
            }
          } catch (rErr) {
            console.log('[Supabase DB Sync] Error syncing rounds:', rErr);
          }

          // Fetch round_of_32 from Supabase to sync Round of 32 matches
          try {
            const { data: dbR32Matches, error: r32Error } = await supabase
              .from('round_of_32')
              .select('*');

            if (!r32Error && dbR32Matches && dbR32Matches.length > 0) {
              const mappedMatches = dbR32Matches.map((m: any) => {
                const matchNumber = m.match_number;
                const statusStr = m.status === 'ongoing' ? 'playing' : (m.status === 'completed' ? 'completed' : 'scheduled');
                
                // Helper to format ISO scheduled_time back to "Day 1 - HH:MM"
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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped R32 matches into existing matches
              const existingMatches = state.matches || [];
              const nonR32Matches = existingMatches.filter((m: any) => m.round !== 'R32' && !m.id.startsWith('M'));
              state.matches = [...mappedMatches, ...nonR32Matches];
              console.log(`[Supabase DB Sync] Round of 32 synced. Total R32 matches merged: ${mappedMatches.length}`);
            }
          } catch (r32Err) {
            console.log('[Supabase DB Sync] Error syncing round_of_32:', r32Err);
          }

          // Fetch round_of_16 from Supabase to sync Round of 16 matches
          try {
            const { data: dbR16Matches, error: r16Error } = await supabase
              .from('round_of_16')
              .select('*');

            if (!r16Error && dbR16Matches && dbR16Matches.length > 0) {
              const mappedR16Matches = dbR16Matches.map((m: any) => {
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

                const p1ByName = state.players?.find((p: any) => p.name === m.player1_name);
                const p2ByName = state.players?.find((p: any) => p.name === m.player2_name);
                const winnerByName = m.winner_name ? state.players?.find((p: any) => p.name === m.winner_name) : null;

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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped R16 matches into existing matches
              const existingMatches = state.matches || [];
              const nonR16Matches = existingMatches.filter((m: any) => m.round !== 'R16' && !m.id.startsWith('R16-'));
              state.matches = [...mappedR16Matches, ...nonR16Matches];
              console.log(`[Supabase DB Sync] Round of 16 synced. Total R16 matches merged: ${mappedR16Matches.length}`);
            }
          } catch (r16Err) {
            console.log('[Supabase DB Sync] Error syncing round_of_16:', r16Err);
          }

          // Fetch quarter_finals from Supabase to sync Quarter Finals matches
          try {
            const { data: dbQFMatches, error: qfError } = await supabase
              .from('quarter_finals')
              .select('*');

            if (!qfError && dbQFMatches && dbQFMatches.length > 0) {
              const mappedQFMatches = dbQFMatches.map((m: any) => {
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

                const p1ByName = state.players?.find((p: any) => p.name === m.player1_name);
                const p2ByName = state.players?.find((p: any) => p.name === m.player2_name);
                const winnerByName = m.winner_name ? state.players?.find((p: any) => p.name === m.winner_name) : null;

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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped QF matches into existing matches
              const existingMatchesQF = state.matches || [];
              const nonQFMatches = existingMatchesQF.filter((m: any) => m.round !== 'QF' && !m.id.startsWith('QF-'));
              state.matches = [...mappedQFMatches, ...nonQFMatches];
              console.log(`[Supabase DB Sync] Quarter Finals synced. Total QF matches merged: ${mappedQFMatches.length}`);
            }
          } catch (qfErr) {
            console.log('[Supabase DB Sync] Error syncing quarter_finals:', qfErr);
          }

          // Fetch semi_finals from Supabase to sync Semi Finals matches
          try {
            const { data: dbSFMatches, error: sfError } = await supabase
              .from('semi_finals')
              .select('*');

            if (!sfError && dbSFMatches && dbSFMatches.length > 0) {
              const mappedSFMatches = dbSFMatches.map((m: any) => {
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

                const p1ByName = state.players?.find((p: any) => p.name === m.player1_name);
                const p2ByName = state.players?.find((p: any) => p.name === m.player2_name);
                const winnerByName = m.winner_name ? state.players?.find((p: any) => p.name === m.winner_name) : null;

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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped SF matches into existing matches
              const existingMatchesSF = state.matches || [];
              const nonSFMatches = existingMatchesSF.filter((m: any) => m.round !== 'SF' && !m.id.startsWith('SF-'));
              state.matches = [...mappedSFMatches, ...nonSFMatches];
              console.log(`[Supabase DB Sync] Semi Finals synced. Total SF matches merged: ${mappedSFMatches.length}`);
            }
          } catch (sfErr) {
            console.log('[Supabase DB Sync] Error syncing semi_finals:', sfErr);
          }

          // Fetch grand_final from Supabase to sync Grand Final matches
          try {
            const { data: dbGFMatches, error: gfError } = await supabase
              .from('grand_final')
              .select('*');

            if (!gfError && dbGFMatches && dbGFMatches.length > 0) {
              const mappedGFMatches = dbGFMatches.map((m: any) => {
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

                const p1ByName = state.players?.find((p: any) => p.name === m.player1_name);
                const p2ByName = state.players?.find((p: any) => p.name === m.player2_name);
                const winnerByName = m.winner_name ? state.players?.find((p: any) => p.name === m.winner_name) : null;

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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped grand final matches into existing matches
              const existingMatchesGF = state.matches || [];
              const nonGFMatches = existingMatchesGF.filter((m: any) => m.round !== 'F' && m.id !== 'FINAL');
              state.matches = [...mappedGFMatches, ...nonGFMatches];
              console.log(`[Supabase DB Sync] Grand Final synced. Total GF matches merged: ${mappedGFMatches.length}`);
            }
          } catch (gfErr) {
            console.log('[Supabase DB Sync] Error syncing grand_final:', gfErr);
          }

          // Fetch third_place from Supabase to sync 3rd Place matches
          try {
            const { data: dbTPMatches, error: tpError } = await supabase
              .from('third_place')
              .select('*');

            if (!tpError && dbTPMatches && dbTPMatches.length > 0) {
              const mappedTPMatches = dbTPMatches.map((m: any) => {
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

                const p1ByName = state.players?.find((p: any) => p.name === m.player1_name);
                const p2ByName = state.players?.find((p: any) => p.name === m.player2_name);
                const winnerByName = m.winner_name ? state.players?.find((p: any) => p.name === m.winner_name) : null;

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
                  scheduledTime: fmtScheduledTime(m.scheduled_time, state.tournamentConfig)
                };
              });

              // Merge mapped 3rd place matches into existing matches
              const existingMatchesTP = state.matches || [];
              const nonTPMatches = existingMatchesTP.filter((m: any) => m.round !== '3RD' && m.id !== '3RD-1');
              state.matches = [...mappedTPMatches, ...nonTPMatches];
              console.log(`[Supabase DB Sync] 3rd Place synced. Total TP matches merged: ${mappedTPMatches.length}`);
            }
          } catch (tpErr) {
            console.log('[Supabase DB Sync] Error syncing third_place:', tpErr);
          }

          // Fetch system_users from Supabase to sync RBAC users
          try {
            const { data: dbSystemUsers, error: usersError } = await supabase
              .from('system_users')
              .select('*');

            if (!usersError && dbSystemUsers) {
              const mappedUsers = dbSystemUsers.map((u: any) => ({
                id: u.id,
                username: u.username,
                role: u.role,
                pin: u.pin
              }));
              state.systemUsers = mappedUsers;
              state.systemUsersTableMissing = false;
              console.log(`[Supabase DB Sync] System users synced. Total: ${mappedUsers.length}`);
            } else if (usersError) {
              console.log('[Supabase DB Sync] Error syncing system_users:', usersError.message);
              if (usersError.code === '42P01' || usersError.message?.includes('does not exist')) {
                state.systemUsersTableMissing = true;
              }
            }
          } catch (usersErr: any) {
            console.log('[Supabase DB Sync] Error syncing system_users:', usersErr);
            state.systemUsersTableMissing = true;
          }

          writeState(state);
        }
      })(), 12000, "Supabase connection timed out");
    } catch (err: any) {
      console.log('[Supabase DB Sync] Fetch profiles notice (deferred):', err?.message || err);
    } finally {
      isSyncing = false;
    }
  }

  // API Endpoints
  app.get("/api/state", async (req, res) => {
    const now = Date.now();
    if (lastSupabaseFetchTime === 0) {
      try {
        await syncWithSupabase();
      } catch (err: any) {
        console.log("[Supabase First Sync] Error during boot sync:", err?.message || err);
      }
    } else if (now - lastSupabaseFetchTime > 30000) {
      syncWithSupabase().catch(err => {
        console.log("[Supabase Background Sync] Sync notice:", err?.message || err);
      });
    }

    const state = readState();
    res.json(state);
  });

  app.post("/api/state", async (req, res) => {
    const currentState = readState();
    const newState = { ...currentState, ...req.body };
    writeState(newState);

    // If wipeBoard is true, remove all players from players table and reset profiles to pending/null seed
    if (req.body.wipeBoard) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          // 1. Delete all rows from players table
          const { error: playersDeleteErr } = await supabase
            .from('players')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (playersDeleteErr) {
            console.log('[Supabase Wipe Board] Delete players error:', playersDeleteErr.message);
          } else {
            console.log('[Supabase Wipe Board] All players successfully removed from players table.');
          }

          // 2. Update all profiles to status = 'pending' and seed = null
          const { error: profilesUpdateErr } = await supabase
            .from('profiles')
            .update({
              status: 'pending',
              seed: null
            })
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (profilesUpdateErr) {
            console.log('[Supabase Wipe Board] Reset profiles error:', profilesUpdateErr.message);
          } else {
            console.log('[Supabase Wipe Board] All profiles reset to pending with NULL seed.');
          }

          // 3. Reset all tournament rounds back to 'not started'
          const { error: resetRoundsErr } = await supabase
            .from('rounds')
            .update({ status: 'not started' })
            .neq('stage', '');
          if (resetRoundsErr) {
            console.log('[Supabase Wipe Board] Reset rounds error:', resetRoundsErr.message);
          } else {
            console.log('[Supabase Wipe Board] All rounds successfully reset to "not started".');
          }

          // 4. Clear matches from all round tables
          await supabase.from('round_of_32').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('round_of_16').delete().gt('match_number', 0);
          await supabase.from('quarter_finals').delete().gt('match_number', 0);
          await supabase.from('semi_finals').delete().gt('match_number', 0);
          await supabase.from('grand_final').delete().gt('match_number', 0);
          await supabase.from('third_place').delete().gt('match_number', 0);

          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Supabase Wipe Board Status] Error details:', err?.message || err);
        }
      }
    }

    // If wipePlayersAndAuthUsers is true, wipe profiles and delete their corresponding auth.users
    if (req.body.wipePlayersAndAuthUsers) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          // 1. Fetch all profile IDs from profiles table first
          const { data: dbProfiles, error: fetchErr } = await supabase
            .from('profiles')
            .select('id');

          if (!fetchErr && dbProfiles && dbProfiles.length > 0) {
            const ids = dbProfiles.map((p: any) => p.id);

            // 2. Delete profiles table data first (only delete profiles table data first, as requested)
            const { error: deleteProfilesErr } = await supabase
              .from('profiles')
              .delete()
              .in('id', ids);

            if (deleteProfilesErr) {
              console.log('[Supabase Wipe Status] Delete profiles outcome:', deleteProfilesErr.message);
            }

            // 3. Delete corresponding auth.users data using service role / admin auth API
            // Only those user IDs that were in the profiles table are touched
            for (const id of ids) {
              const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(id);
              if (deleteAuthErr) {
                console.log(`[Supabase Wipe Status] Delete auth.user ${id} outcome:`, deleteAuthErr.message);
              }
            }
          }
          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Supabase Wipe Status] Players wipe details:', err?.message || err);
        }
      }
    }

    // If playerApplications are changed, sync statuses back to Supabase profiles
    if (req.body.playerApplications && Array.isArray(req.body.playerApplications)) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });
          
          // Update statuses in parallel using Promise.all (only for valid UUIDs)
          const validApps = req.body.playerApplications.filter((app: any) => isUUID(app.id));
          const updatePromises = validApps.map((app: any) =>
            supabase
              .from('profiles')
              .update({ status: app.status })
              .eq('id', app.id)
          );
          
          const results = await Promise.all(updatePromises);
          results.forEach((res, index) => {
            if (res.error) {
              const app = validApps[index];
              console.log(`[Supabase Status Sync] Update status details for user ${app?.id}:`, res.error.message);
            }
          });

          // Create rows in players table for newly approved applications (only for valid UUIDs)
          const approvedApps = req.body.playerApplications.filter((app: any) => app.status === 'approved' && isUUID(app.id));
          if (approvedApps.length > 0) {
            for (const app of approvedApps) {
              try {
                const { data: existingPlayer } = await supabase
                  .from('players')
                  .select('id')
                  .eq('profile_id', app.id)
                  .maybeSingle();

                if (!existingPlayer) {
                  const { error: insertErr } = await supabase
                    .from('players')
                    .insert({
                      profile_id: app.id,
                      name: app.fullName,
                      player_name: app.fullName
                    });
                  if (insertErr) {
                    console.log(`[Supabase Player Table Sync] Insert details for user ${app.id}:`, insertErr.message);
                  } else {
                    console.log(`[Supabase Player Table Sync] Successfully created player row for ${app.fullName}`);
                  }
                }
              } catch (err: any) {
                console.log(`[Supabase Player Table Sync] Error checking/inserting user ${app.id}:`, err?.message || err);
              }
            }
          }

          // Invalidate cache so next GET is direct
          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Supabase Status Sync] Operation details:', err?.message || err);
        }
      }
    }

    // If players list is changed, sync details and stats back to Supabase profiles
    if (req.body.players && Array.isArray(req.body.players)) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          // Update stats in parallel using Promise.all on both profiles and players tables (only for valid UUIDs)
          const validPlayers = req.body.players.filter((player: any) => isUUID(player.id));
          const updatePromises = validPlayers.map(async (player: any) => {
            let currentPhotoUrl = player.photoUrl;

            // Handle base64 image replacement and upload
            if (currentPhotoUrl && currentPhotoUrl.startsWith('data:')) {
              try {
                // Fetch the existing profile to get the old photo url
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('photo_url')
                  .eq('id', player.id)
                  .maybeSingle();

                const oldPhotoUrl = existingProfile?.photo_url;

                // Upload new photo
                const uploadedPhotoUrl = await uploadBase64ToSupabase(
                  supabase,
                  'player photos',
                  currentPhotoUrl,
                  player.id,
                  'photo'
                );

                if (uploadedPhotoUrl) {
                  currentPhotoUrl = uploadedPhotoUrl;
                  player.photoUrl = uploadedPhotoUrl;

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
                      console.log('[Supabase Storage] Old photo deletion issue:', delErr);
                    }
                  }
                }
              } catch (photoErr: any) {
                console.log(`[Supabase Player Photo Sync Error] ${player.id}:`, photoErr?.message || photoErr);
              }
            }

            // Update profiles
            const { error: profileErr } = await supabase
              .from('profiles')
              .update({
                full_name: player.name,
                nickname: player.nickname || null,
                club: player.club || null,
                photo_url: currentPhotoUrl || null,
                tournament_type: player.tournamentType || null,
                status: player.status === 'active' ? 'approved' : player.status,
                seed: player.seed,
                matches_played: player.matchesPlayed,
                matches_won: player.matchesWon,
                total_points: player.totalPoints,
                highest_break: player.highestBreak,
              })
              .eq('id', player.id);

            if (profileErr) {
              console.log(`[Supabase Player Stats Sync] Profile table update failed for ${player.id}:`, profileErr.message);
            }

            // Update players table
            try {
              const { data: existingPlayerTable } = await supabase
                .from('players')
                .select('id')
                .eq('profile_id', player.id)
                .maybeSingle();

              if (!existingPlayerTable) {
                // Insert new player row since it doesn't exist
                const { error: insertErr } = await supabase
                  .from('players')
                  .insert({
                    profile_id: player.id,
                    player_name: player.name,
                    name: player.name,
                    nickname: player.nickname || null,
                    club: player.club || null,
                    seed: player.seed || 1,
                    photo_url: currentPhotoUrl || null,
                    photoUrl: currentPhotoUrl || null,
                    matches_played: player.matchesPlayed || 0,
                    matches_won: player.matchesWon || 0,
                    total_points: player.totalPoints || 0,
                    highest_break: player.highestBreak || 0,
                    status: player.status || 'active',
                    tournament_type: player.tournamentType || null,
                    tournamentType: player.tournamentType || null
                  });
                if (insertErr) {
                  console.log(`[Supabase Players Sync Server] Insert failed for missing player ${player.id}:`, insertErr.message);
                } else {
                  console.log(`[Supabase Players Sync Server] Successfully inserted missing player row for ${player.name}`);
                }
              } else {
                // Update players table
                const { error: playerErr1 } = await supabase
                  .from('players')
                  .update({
                    status: player.status,
                    seed: player.seed,
                    matches_played: player.matchesPlayed,
                    matches_won: player.matchesWon,
                    total_points: player.totalPoints,
                    highest_break: player.highestBreak,
                    player_name: player.name,
                    name: player.name,
                    nickname: player.nickname,
                    club: player.club,
                    photo_url: currentPhotoUrl,
                    tournament_type: player.tournamentType
                  })
                  .eq('profile_id', player.id);

                if (playerErr1) {
                  // Try updating by 'id' just in case
                  await supabase
                    .from('players')
                    .update({
                      status: player.status,
                      seed: player.seed,
                      matches_played: player.matchesPlayed,
                      matches_won: player.matchesWon,
                      total_points: player.totalPoints,
                      highest_break: player.highestBreak,
                      player_name: player.name,
                      name: player.name,
                      nickname: player.nickname,
                      club: player.club,
                      photo_url: currentPhotoUrl,
                      tournament_type: player.tournamentType
                    })
                    .eq('id', player.id);
                }
              }
            } catch (err: any) {
              console.log(`[Supabase Players Sync Server] Error handling player table update/insert for ${player.id}:`, err?.message || err);
            }
          });

          await Promise.all(updatePromises);

          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Supabase Player Stats Sync] Operation details:', err?.message || err);
        }
      }
    }

    // If tournamentConfig is changed, sync tournament types to Supabase
    if (req.body.tournamentConfig) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          const { tournamentTypes, selectedTournamentType } = req.body.tournamentConfig;
          
          if (Array.isArray(tournamentTypes)) {
            // Get current types in Supabase
            const { data: currentDbTypes, error: selectErr } = await supabase
              .from('tournament_types')
              .select('*');

            if (!selectErr && currentDbTypes) {
              const dbTypeNames = currentDbTypes.map((t: any) => t.name);

              // Delete types that are no longer in the list
              const toDelete = dbTypeNames.filter(name => !tournamentTypes.includes(name));
              if (toDelete.length > 0) {
                const { error: delErr } = await supabase
                  .from('tournament_types')
                  .delete()
                  .in('name', toDelete);
                if (delErr) console.log('[Supabase Type Sync] Delete tournament types notice:', delErr.message);
              }

              // Insert or update remaining types
              for (const type of tournamentTypes) {
                const isActive = type === selectedTournamentType;
                const { error: upsertErr } = await supabase
                  .from('tournament_types')
                  .upsert({
                    name: type,
                    is_active: isActive
                  }, { onConflict: 'name' });
                
                if (upsertErr) console.log(`[Supabase Type Sync] Upsert tournament type "${type}" notice:`, upsertErr.message);
              }
            }
          } else if (selectedTournamentType) {
            // If only active type changed, update active states
            const { error: resetErr } = await supabase
              .from('tournament_types')
              .update({ is_active: false })
              .not('name', 'eq', selectedTournamentType);
            
            if (resetErr) console.log('[Supabase Type Sync] Reset active states notice:', resetErr.message);

            const { error: setErr } = await supabase
              .from('tournament_types')
              .update({ is_active: true })
              .eq('name', selectedTournamentType);
            
            if (setErr) console.log(`[Supabase Type Sync] Set active state for "${selectedTournamentType}" notice:`, setErr.message);
          }
        } catch (err: any) {
          console.log('[Supabase Tournament Types Sync] Operation details:', err?.message || err);
        }
      }
    }

    // If matches list is changed, sync details back to Supabase round tables on the server side
    if (req.body.matches && Array.isArray(req.body.matches)) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          const currentPlayers = req.body.players || readState().players || [];

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

          // Sync Round of 32
          try {
            const r32Matches = req.body.matches.filter((m: any) => m.round === 'R32' || m.id.startsWith('M'));
            if (r32Matches.length > 0) {
              const rowsToUpsert = r32Matches.map((m: any) => {
                const matchNumStr = m.id.replace(/\D/g, ''); // Extract digits
                const matchNumber = parseInt(matchNumStr, 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 16) {
                  return null;
                }

                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase round_of_32 Sync] Upsert notice:', upsertErr.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase round_of_32 Sync] General error:', err?.message || err);
          }

          // Sync Round of 16
          try {
            const r16Matches = req.body.matches.filter((m: any) => m.round === 'R16' || m.id.startsWith('R16-'));
            if (r16Matches.length > 0) {
              const rowsToUpsertR16 = r16Matches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 8) {
                  return null;
                }

                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase round_of_16 Sync] Upsert notice:', upsertR16Err.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase round_of_16 Sync] General error:', err?.message || err);
          }

          // Sync Quarter Finals
          try {
            const qfMatches = req.body.matches.filter((m: any) => m.round === 'QF' || m.id.startsWith('QF-'));
            if (qfMatches.length > 0) {
              const rowsToUpsertQF = qfMatches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 4) {
                  return null;
                }

                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase quarter_finals Sync] Upsert notice:', upsertQFErr.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase quarter_finals Sync] General error:', err?.message || err);
          }

          // Sync Semi Finals
          try {
            const sfMatches = req.body.matches.filter((m: any) => m.round === 'SF' || m.id.startsWith('SF-'));
            if (sfMatches.length > 0) {
              const rowsToUpsertSF = sfMatches.map((m: any) => {
                const matchNumber = m.id.includes('-') 
                  ? parseInt(m.id.split('-').pop() || '', 10) 
                  : parseInt(m.id.replace(/\D/g, ''), 10);
                if (isNaN(matchNumber) || matchNumber < 1 || matchNumber > 2) {
                  return null;
                }

                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase semi_finals Sync] Upsert notice:', upsertSFErr.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase semi_finals Sync] General error:', err?.message || err);
          }

          // Sync Grand Final
          try {
            const gfMatches = req.body.matches.filter((m: any) => m.id === 'FINAL' || m.round === 'F');
            if (gfMatches.length > 0) {
              const rowsToUpsertGF = gfMatches.map((m: any) => {
                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase grand_final Sync] Upsert notice:', upsertGFErr.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase grand_final Sync] General error:', err?.message || err);
          }

          // Sync 3rd Place Match
          try {
            const tpMatches = req.body.matches.filter((m: any) => m.id === '3RD-1' || m.round === '3RD');
            if (tpMatches.length > 0) {
              const rowsToUpsertTP = tpMatches.map((m: any) => {
                const p1 = currentPlayers.find((p: any) => p.id === m.player1Id);
                const p2 = currentPlayers.find((p: any) => p.id === m.player2Id);
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
                  winner_name: m.winnerId ? (currentPlayers.find((p: any) => p.id === m.winnerId)?.name || null) : null,
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
                  console.log('[Server Supabase third_place Sync] Upsert notice:', upsertTPErr.message);
                }
              }
            }
          } catch (err: any) {
            console.log('[Server Supabase third_place Sync] General error:', err?.message || err);
          }

          // Check for active or ongoing matches in each round, and update the rounds table status to 'active', ONLY if the tournament has actually started!
          const tournamentStarted = newState.isTournamentStarted;
          if (tournamentStarted) {
            try {
              const hasActiveR32 = req.body.matches.some((m: any) => (m.round === 'R32' || m.id.startsWith('M')) && (m.status === 'playing' || m.status === 'ongoing'));
              const hasActiveR16 = req.body.matches.some((m: any) => (m.round === 'R16' || m.id.startsWith('R16-')) && (m.status === 'playing' || m.status === 'ongoing'));
              const hasActiveQF = req.body.matches.some((m: any) => (m.round === 'QF' || m.id.startsWith('QF-')) && (m.status === 'playing' || m.status === 'ongoing'));
              const hasActiveSF = req.body.matches.some((m: any) => (m.round === 'SF' || m.id.startsWith('SF-')) && (m.status === 'playing' || m.status === 'ongoing'));
              const hasActiveGF = req.body.matches.some((m: any) => (m.id === 'FINAL' || m.round === 'F') && (m.status === 'playing' || m.status === 'ongoing'));

              if (hasActiveR32) {
                await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Round of 32');
              }
              if (hasActiveR16) {
                await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Round of 16');
              }
              if (hasActiveQF) {
                await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Quarter finals');
              }
              if (hasActiveSF) {
                await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Semi finals');
              }
              if (hasActiveGF) {
                await supabase.from('rounds').update({ status: 'active' }).eq('stage', 'Final');
              }
            } catch (err: any) {
              console.log('[Server Supabase rounds active update] General error:', err?.message || err);
            }
          }

          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Server Supabase Matches Sync] Operation details:', err?.message || err);
        }
      }
    }

    // If systemUsers list is changed, sync details back to Supabase system_users table
    if (req.body.systemUsers && Array.isArray(req.body.systemUsers)) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
      const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

      if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
        try {
          const supabase = createClient(supabaseUrl, activeKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          });

          // Fetch currently existing usernames in DB to handle deletion
          const { data: dbCurrentUsers, error: selectErr } = await supabase
            .from('system_users')
            .select('id, username');

          if (!selectErr && dbCurrentUsers) {
            const incomingUsernames = req.body.systemUsers.map((u: any) => u.username);

            // Delete users no longer present
            const toDelete = dbCurrentUsers.filter((u: any) => !incomingUsernames.includes(u.username));
            if (toDelete.length > 0) {
              const toDeleteIds = toDelete.map((u: any) => u.id);
              const { error: delErr } = await supabase
                .from('system_users')
                .delete()
                .in('id', toDeleteIds);
              if (delErr) {
                console.log('[Supabase System Users Sync] Delete user notice:', delErr.message);
              }
            }

            // Upsert incoming users
            for (const user of req.body.systemUsers) {
              const isUuidVal = isUUID(user.id);
              const payload: any = {
                username: user.username,
                role: user.role,
                pin: user.pin
              };
              if (isUuidVal) {
                payload.id = user.id;
              }

              const { error: upsertErr } = await supabase
                .from('system_users')
                .upsert(payload, { onConflict: 'username' });

              if (upsertErr) {
                console.log(`[Supabase System Users Sync] Upsert user "${user.username}" notice:`, upsertErr.message);
              }
            }
            newState.systemUsersTableMissing = false;
          } else if (selectErr) {
            console.log('[Supabase System Users Sync] Fetch current users error:', selectErr.message);
            if (selectErr.code === '42P01' || selectErr.message?.includes('does not exist')) {
              newState.systemUsersTableMissing = true;
            }
          }
          lastSupabaseFetchTime = 0;
        } catch (err: any) {
          console.log('[Supabase System Users Sync] Operation details:', err?.message || err);
        }
      }
    }

    res.json({ success: true, state: newState });
  });

  app.post("/api/applications", async (req, res) => {
    const state = readState();
    if (!state.publicRegistrationEnabled) {
      return res.status(400).json({ error: "Registration is currently closed." });
    }
    const newApp = {
      ...req.body,
      id: `app-${Date.now()}`,
      status: "pending",
      appliedAt: new Date().toISOString()
    };

    let supabaseSyncStatus = "skipped";
    let supabaseSyncError: string | null = null;

    // Try registering in Supabase from the server side to trigger the SQL profiles trigger
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
    const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

    if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
      try {
        supabaseSyncStatus = useServiceRole ? "active_service_role" : "active_anon_fallback";
        console.log(`[Supabase Sync] Attempting registration for ${newApp.fullName} (${newApp.email || "no-email"}) using ${useServiceRole ? 'Service Role (Admin)' : 'Anon Key (Signup)'}`);
        const supabase = createClient(supabaseUrl, activeKey, {
          auth: {
            persistSession: false, // Turn off session persistence since it's a server environment
            autoRefreshToken: false,
          }
        });

        const userEmail = newApp.email || `player-${Date.now()}@example.com`;
        const userPassword = `PlayerPass123_Secure!`;
        const initialMetadata = {
          full_name: newApp.fullName || "",
          nickname: newApp.nickname || "",
          club: newApp.club || "",
          phone_number: newApp.phoneNumber || "",
          whatsapp_number: newApp.whatsappNumber || "",
          social_media_page: newApp.socialMediaPage || "",
          photo_url: "", // omitted base64 to avoid Request body too large (max 1MB) error
          document_url: "", // omitted base64 to avoid Request body too large (max 1MB) error
          document_name: newApp.documentName || "",
          tournament_type: newApp.tournamentType || "",
        };

        let targetUserId: string | null = null;

        if (useServiceRole) {
          // Admin registration: completely bypasses rate limits and email confirmation checks!
          let { data, error } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: userPassword,
            email_confirm: true,
            user_metadata: initialMetadata
          });

          if (error) {
            if (error.message.includes('already been registered') || error.message.includes('already exists')) {
              console.log(`[Supabase Admin Sync] Email ${userEmail} already exists. Finding existing user ID...`);
              const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
              if (!listError && userList && userList.users) {
                const existingUser = userList.users.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
                if (existingUser) {
                  targetUserId = existingUser.id;
                  console.log(`[Supabase Admin Sync] Found user ID: ${targetUserId}. Updating user metadata with initial metadata...`);
                  await supabase.auth.admin.updateUserById(targetUserId, {
                    user_metadata: { ...existingUser.user_metadata, ...initialMetadata }
                  });
                }
              }
            } else {
              console.log('[Supabase Admin Sync] Create user details:', error.message);
            }
          } else if (data && data.user) {
            targetUserId = data.user.id;
            console.log('[Supabase Admin Sync Success]: Created and auto-confirmed user:', targetUserId);
          }
        } else {
          // Public signup fallback: may encounter rate limits or require email confirmations
          const { data, error } = await supabase.auth.signUp({
            email: userEmail,
            password: userPassword,
            options: {
              data: initialMetadata
            }
          });

          if (error) {
            if (error.message.includes('already been registered') || error.message.includes('already exists')) {
              console.log(`[Supabase SignUp Sync] User already exists for ${userEmail}. We will try direct database upsert if we can.`);
            } else {
              console.log('[Supabase SignUp Sync] Signup details:', error.message);
            }
          } else if (data && data.user) {
            targetUserId = data.user.id;
            console.log('[Supabase SignUp Sync Success]: Created user:', targetUserId);
          }
        }

        // Upload files to Supabase Storage and get public URLs
        if (targetUserId) {
          let finalPhotoUrl = newApp.photoUrl;
          let finalDocumentUrl = newApp.documentUrl;

          // 1. Photo Upload
          if (newApp.photoUrl && newApp.photoUrl.startsWith('data:')) {
            console.log(`[Supabase Storage] Uploading player photo for ${newApp.fullName}...`);
            const uploadedPhotoUrl = await uploadBase64ToSupabase(
              supabase,
              'player photos',
              newApp.photoUrl,
              targetUserId,
              'photo'
            );
            if (uploadedPhotoUrl) {
              console.log(`[Supabase Storage] Photo uploaded successfully: ${uploadedPhotoUrl}`);
              finalPhotoUrl = uploadedPhotoUrl;
            }
          }

          // 2. Document Upload
          if (newApp.documentUrl && newApp.documentUrl.startsWith('data:')) {
            console.log(`[Supabase Storage] Uploading player document for ${newApp.fullName}...`);
            const uploadedDocUrl = await uploadBase64ToSupabase(
              supabase,
              'player documents',
              newApp.documentUrl,
              targetUserId,
              'document',
              newApp.documentName
            );
            if (uploadedDocUrl) {
              console.log(`[Supabase Storage] Document uploaded successfully: ${uploadedDocUrl}`);
              finalDocumentUrl = uploadedDocUrl;
            }
          }

          // Update local newApp memory with the newly fetched Supabase URL (stripping raw base64)
          newApp.photoUrl = finalPhotoUrl;
          newApp.documentUrl = finalDocumentUrl;

          // Update auth metadata to use the newly uploaded storage public URLs instead of base64
          if (useServiceRole) {
            try {
              await supabase.auth.admin.updateUserById(targetUserId, {
                user_metadata: {
                  full_name: newApp.fullName || "",
                  nickname: newApp.nickname || "",
                  club: newApp.club || "",
                  phone_number: newApp.phoneNumber || "",
                  whatsapp_number: newApp.whatsappNumber || "",
                  social_media_page: newApp.socialMediaPage || "",
                  photo_url: finalPhotoUrl || "",
                  document_url: finalDocumentUrl || "",
                  document_name: newApp.documentName || "",
                  tournament_type: newApp.tournamentType || "",
                }
              });
              console.log('[Supabase Admin Sync]: Updated user auth metadata with new file URLs.');
            } catch (metaErr: any) {
              console.log('[Supabase Admin Sync] Auth metadata update details:', metaErr?.message || metaErr);
            }
          }

          // DOUBLE-INSURANCE: Direct Upsert into public.profiles with the direct public URLs
          console.log(`[Supabase DB Sync] Direct upsert to profiles table for user: ${targetUserId}`);
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: targetUserId,
              full_name: newApp.fullName || "",
              nickname: newApp.nickname || null,
              club: newApp.club || null,
              phone_number: newApp.phoneNumber || null,
              whatsapp_number: newApp.whatsappNumber || null,
              social_media_page: newApp.socialMediaPage || null,
              photo_url: finalPhotoUrl || null,
              document_url: finalDocumentUrl || null,
              document_name: newApp.documentName || null,
              tournament_type: newApp.tournamentType || null,
              status: 'pending'
            });

          if (upsertError) {
            supabaseSyncStatus = "warning_profiles_upsert_failed";
            supabaseSyncError = upsertError.message;
            console.log('[Supabase DB Sync] Direct profiles upsert notice:', upsertError.message);
          } else {
            supabaseSyncStatus = "success";
            console.log('[Supabase DB Sync Success]: Successfully upserted player profile directly.');
          }
        } else {
          supabaseSyncStatus = "warning_no_target_user_id";
          supabaseSyncError = "Could not create or find target user ID in Supabase Auth.";
          console.warn('[Supabase Sync Warning] Could not determine target UUID for file upload and profile upsert.');
        }
      } catch (err: any) {
        supabaseSyncStatus = "error";
        supabaseSyncError = err?.message || String(err);
        console.log('[Supabase Sync] Operation details:', err?.message || err);
      }
    } else {
      supabaseSyncStatus = "skipped_missing_credentials";
      console.log('[Supabase Sync] Skipped. Supabase keys not set or using placeholder values.');
    }

    // Now push to state and write (ensuring data.json has storage public URLs, NOT huge base64 strings!)
    state.playerApplications.push(newApp);
    writeState(state);

    // Invalidate Supabase cache so the next GET reflects the new profile instantly
    lastSupabaseFetchTime = 0;

    res.json({
      success: true,
      application: newApp,
      supabaseSyncStatus,
      supabaseSyncError
    });
  });

  // Serve Vite or static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
