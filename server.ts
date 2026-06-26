import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");

interface TournamentState {
  players: any[];
  matches: any[];
  isTournamentStarted: boolean;
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
      third: string;
      highestBreak: string;
    };
  };
  systemUsers: any[];
  rolePermissions: any[];
  playerApplications: any[];
  publicRegistrationEnabled: boolean;
  systemLogo?: string;
}

const DEFAULT_STATE: TournamentState = {
  players: [],
  matches: [],
  isTournamentStarted: false,
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
      first: "₦350,000 + Certificate",
      second: "₦150,000 + Certificate",
      third: "Meal of Choice",
      highestBreak: "₦50,000"
    }
  },
  systemUsers: [
    { id: "u-admin", username: "admin", role: "Admin", pin: "1234" },
    { id: "u-owner", username: "owner", role: "Owner", pin: "5555" },
    { id: "u-gameadmin", username: "game_admin", role: "Game Admin", pin: "7777" },
    { id: "u-referee", username: "referee", role: "Referee", pin: "2222" },
    { id: "u-scorer", username: "scorer", role: "Scorer", pin: "3333" },
    { id: "u-player", username: "player", role: "Player", pin: "4444" }
  ],
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
  systemLogo: ""
};

function readState(): TournamentState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
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
        "application/pdf": "pdf",
      };
      ext = mimeToExt[contentType] || "bin";
    }

    const buffer = Buffer.from(base64Data, "base64");
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

  // API Endpoints
  app.get("/api/state", (req, res) => {
    res.json(readState());
  });

  app.post("/api/state", (req, res) => {
    const currentState = readState();
    const newState = { ...currentState, ...req.body };
    writeState(newState);
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

    // Try registering in Supabase from the server side to trigger the SQL profiles trigger
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    const useServiceRole = !!(supabaseUrl && serviceRoleKey && serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY");
    const activeKey = useServiceRole ? serviceRoleKey : supabaseAnonKey;

    if (supabaseUrl && activeKey && supabaseUrl !== "YOUR_SUPABASE_URL" && activeKey !== "YOUR_SUPABASE_ANON_KEY") {
      try {
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
          full_name: newApp.fullName,
          nickname: newApp.nickname,
          club: newApp.club,
          phone_number: newApp.phoneNumber,
          whatsapp_number: newApp.whatsappNumber,
          social_media_page: newApp.socialMediaPage,
          photo_url: "", // omitted base64 to avoid Request body too large (max 1MB) error
          document_url: "", // omitted base64 to avoid Request body too large (max 1MB) error
          document_name: newApp.documentName,
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
                const existingUser = userList.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
                if (existingUser) {
                  targetUserId = existingUser.id;
                  console.log(`[Supabase Admin Sync] Found user ID: ${targetUserId}. Updating user metadata with initial metadata...`);
                  await supabase.auth.admin.updateUserById(targetUserId, {
                    user_metadata: { ...existingUser.user_metadata, ...initialMetadata }
                  });
                }
              }
            } else {
              console.error('[Supabase Admin Sync Error]:', error.message);
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
              console.error('[Supabase SignUp Sync Error]:', error.message);
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
                  full_name: newApp.fullName,
                  nickname: newApp.nickname,
                  club: newApp.club,
                  phone_number: newApp.phoneNumber,
                  whatsapp_number: newApp.whatsappNumber,
                  social_media_page: newApp.socialMediaPage,
                  photo_url: finalPhotoUrl,
                  document_url: finalDocumentUrl,
                  document_name: newApp.documentName,
                }
              });
              console.log('[Supabase Admin Sync]: Updated user auth metadata with new file URLs.');
            } catch (metaErr: any) {
              console.error('[Supabase Admin Sync Error] Updating user auth metadata failed:', metaErr?.message || metaErr);
            }
          }

          // DOUBLE-INSURANCE: Direct Upsert into public.profiles with the direct public URLs
          console.log(`[Supabase DB Sync] Direct upsert to profiles table for user: ${targetUserId}`);
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: targetUserId,
              full_name: newApp.fullName,
              nickname: newApp.nickname,
              club: newApp.club,
              phone_number: newApp.phoneNumber,
              whatsapp_number: newApp.whatsappNumber,
              social_media_page: newApp.socialMediaPage,
              photo_url: finalPhotoUrl,
              document_url: finalDocumentUrl,
              document_name: newApp.documentName,
              status: 'pending'
            });

          if (upsertError) {
            console.error('[Supabase DB Sync Error]: Direct profiles upsert failed:', upsertError.message);
          } else {
            console.log('[Supabase DB Sync Success]: Successfully upserted player profile directly.');
          }
        } else {
          console.warn('[Supabase Sync Warning] Could not determine target UUID for file upload and profile upsert.');
        }
      } catch (err: any) {
        console.error('[Supabase Sync Exception]:', err?.message || err);
      }
    } else {
      console.log('[Supabase Sync] Skipped. Supabase keys not set or using placeholder values.');
    }

    // Now push to state and write (ensuring data.json has storage public URLs, NOT huge base64 strings!)
    state.playerApplications.push(newApp);
    writeState(state);

    res.json({ success: true, application: newApp });
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
