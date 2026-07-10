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
