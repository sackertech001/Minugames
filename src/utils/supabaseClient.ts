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
  const profileId = playerObj.profile_id;
  if (!profileId) return false;

  try {
    // 1. Check if a player row already exists in the database
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('profile_id', profileId);

    if (existing && existing.length > 0) {
      console.log(`[Client safeInsertPlayer] Player row already exists for profile_id: ${profileId}`);
      // Clean up duplicates if any
      if (existing.length > 1) {
        console.log(`[Client safeInsertPlayer] Cleaning up ${existing.length - 1} duplicate rows for profile_id: ${profileId}`);
        const idsToDelete = existing.slice(1).map((r: any) => r.id);
        await supabase.from('players').delete().in('id', idsToDelete);
      }
      return true;
    }
  } catch (err) {
    console.warn('[Client safeInsertPlayer] Error checking duplicates:', err);
  }

  let attemptObj = { ...playerObj };
  // Keep track of missing columns we've discovered
  const missingColumns = new Set<string>();

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
      console.log(`[Client safeInsertPlayer] Removing missing column '${missingColumn}' and retrying...`);
      missingColumns.add(missingColumn);
      delete attemptObj[missingColumn];
      
      if (missingColumn === 'photo_url') delete attemptObj['photoUrl'];
      if (missingColumn === 'photoUrl') delete attemptObj['photo_url'];
      if (missingColumn === 'tournament_type') delete attemptObj['tournamentType'];
      if (missingColumn === 'tournamentType') delete attemptObj['tournament_type'];
    } else {
      console.log(`[Client safeInsertPlayer] Safe insert fallback for profile_id: ${profileId}`);
      
      const fallbackObj: any = {
        profile_id: profileId,
        status: playerObj.status || 'active',
        seed: playerObj.seed || 1
      };

      // Only add name/player_name if we haven't identified them as missing
      if (!missingColumns.has('name')) {
        fallbackObj.name = playerObj.name || playerObj.player_name || 'Tournament Player';
      }
      if (!missingColumns.has('player_name')) {
        fallbackObj.player_name = playerObj.player_name || playerObj.name || 'Tournament Player';
      }

      const { error: fallbackErr } = await supabase.from('players').insert(fallbackObj);
      return !fallbackErr;
    }
  }
  return false;
}

export async function safeUpdatePlayer(supabase: any, profileId: string, playerObj: any): Promise<boolean> {
  let attemptObj = { ...playerObj };
  const missingColumns = new Set<string>();

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
      console.log(`[Client safeUpdatePlayer] Removing missing column '${missingColumn}' and retrying...`);
      missingColumns.add(missingColumn);
      delete attemptObj[missingColumn];
      
      if (missingColumn === 'photo_url') delete attemptObj['photoUrl'];
      if (missingColumn === 'photoUrl') delete attemptObj['photo_url'];
      if (missingColumn === 'tournament_type') delete attemptObj['tournamentType'];
      if (missingColumn === 'tournamentType') delete attemptObj['tournament_type'];
    } else {
      const fallbackObj: any = {
        status: playerObj.status || 'active',
        seed: playerObj.seed || 1
      };

      if (!missingColumns.has('name')) {
        fallbackObj.name = playerObj.name || playerObj.player_name || 'Tournament Player';
      }
      if (!missingColumns.has('player_name')) {
        fallbackObj.player_name = playerObj.player_name || playerObj.name || 'Tournament Player';
      }

      const { error: fallbackErr } = await supabase
        .from('players')
        .update(fallbackObj)
        .or(`profile_id.eq.${profileId},id.eq.${profileId}`);
      return !fallbackErr;
    }
  }
  return false;
}
