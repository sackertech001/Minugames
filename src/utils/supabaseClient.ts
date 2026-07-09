import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client, or null if credentials are not configured.
 * This function uses lazy initialization to prevent application crashes during startup
 * if the environment variables are not yet provided.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Read environment variables (supports client-side Vite and server-side Node environments)
  const metaEnv = (import.meta as any).env;
  const supabaseUrl = metaEnv?.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (error) {
    console.log('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Helper to check if Supabase is fully configured and connected.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

export async function safeInsertPlayer(supabase: any, playerObj: any): Promise<boolean> {
  let attemptObj = { ...playerObj };
  for (let i = 0; i < 10; i++) {
    const { error } = await supabase.from('players').insert(attemptObj);
    if (!error) {
      return true;
    }
    
    const errMsg = error.message || '';
    const match = errMsg.match(/Could not find the '([^']+)' column/) ||
                  errMsg.match(/column "([^"]+)" does not exist/) ||
                  errMsg.match(/column '([^']+)' does not exist/);
                  
    if (match) {
      const missingColumn = match[1];
      console.log(`[safeInsertPlayer] Removing missing column '${missingColumn}' and retrying...`);
      delete attemptObj[missingColumn];
      if (missingColumn === 'photo_url') delete attemptObj['photoUrl'];
      if (missingColumn === 'photoUrl') delete attemptObj['photo_url'];
      if (missingColumn === 'tournament_type') delete attemptObj['tournamentType'];
      if (missingColumn === 'tournamentType') delete attemptObj['tournament_type'];
      if (missingColumn === 'player_name') delete attemptObj['name'];
      if (missingColumn === 'name') delete attemptObj['player_name'];
    } else {
      console.log(`[safeInsertPlayer] Safe insert fallback for profile_id: ${playerObj.profile_id}`);
      const { error: fallbackErr } = await supabase.from('players').insert({
        profile_id: playerObj.profile_id,
        name: playerObj.name || playerObj.player_name || 'Tournament Player',
        player_name: playerObj.player_name || playerObj.name || 'Tournament Player',
        status: playerObj.status || 'active',
        seed: playerObj.seed || 1
      });
      return !fallbackErr;
    }
  }
  return false;
}

export async function safeUpdatePlayer(supabase: any, profileId: string, playerObj: any): Promise<boolean> {
  let attemptObj = { ...playerObj };
  for (let i = 0; i < 10; i++) {
    const { error } = await supabase
      .from('players')
      .update(attemptObj)
      .or(`profile_id.eq.${profileId},id.eq.${profileId}`);
    if (!error) {
      return true;
    }
    
    const errMsg = error.message || '';
    const match = errMsg.match(/Could not find the '([^']+)' column/) ||
                  errMsg.match(/column "([^"]+)" does not exist/) ||
                  errMsg.match(/column '([^']+)' does not exist/);
                  
    if (match) {
      const missingColumn = match[1];
      console.log(`[safeUpdatePlayer] Removing missing column '${missingColumn}' and retrying...`);
      delete attemptObj[missingColumn];
      if (missingColumn === 'photo_url') delete attemptObj['photoUrl'];
      if (missingColumn === 'photoUrl') delete attemptObj['photo_url'];
      if (missingColumn === 'tournament_type') delete attemptObj['tournamentType'];
      if (missingColumn === 'tournamentType') delete attemptObj['tournament_type'];
      if (missingColumn === 'player_name') delete attemptObj['name'];
      if (missingColumn === 'name') delete attemptObj['player_name'];
    } else {
      const { error: fallbackErr } = await supabase
        .from('players')
        .update({
          name: playerObj.name || playerObj.player_name || 'Tournament Player',
          player_name: playerObj.player_name || playerObj.name || 'Tournament Player',
          status: playerObj.status || 'active',
          seed: playerObj.seed || 1
        })
        .or(`profile_id.eq.${profileId},id.eq.${profileId}`);
      return !fallbackErr;
    }
  }
  return false;
}
