-- ====================================================================
-- SUPABASE TOURNAMENT PORTAL SETUP SCRIPT (UNRESTRICTED)
-- ====================================================================
-- This script sets up an unrestricted `profiles` table in your public schema
-- and automatically synchronizes new users from Supabase Auth (`auth.users`)
-- into `public.profiles` using a PostgreSQL database trigger.
-- 
-- Safe & Simple: Does not touch system storage tables to avoid owner/permission errors.
--
-- How to use:
-- 1. Open your Supabase Dashboard.
-- 2. Go to the "SQL Editor" tab from the left sidebar.
-- 3. Click "New Query" and paste the contents of this file.
-- 4. Click "Run" (or Cmd+Enter / Ctrl+Enter) to execute.
-- ====================================================================

-- ====================================================================
-- 1. CLEANUP (Optional / Re-runnable guard)
-- ====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ====================================================================
-- 2. CREATE UNRESTRICTED PROFILES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT,
  club TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  social_media_page TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending', -- Unrestricted status (no restrictive CHECK constraints)
  seed INT,
  document_url TEXT,
  document_name TEXT,
  tournament_type TEXT,
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  total_points INT DEFAULT 0,
  highest_break INT DEFAULT 0,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add descriptions / comments to the table and columns for documentation
COMMENT ON TABLE public.profiles IS 'Stores player registration applications and approved participant profile details.';
COMMENT ON COLUMN public.profiles.id IS 'References the unique authenticated user ID in auth.users.';
COMMENT ON COLUMN public.profiles.status IS 'Status of the tournament participant application or standing.';

-- ====================================================================
-- 3. AUTOMATIC UPDATED_AT TIMESTAMP FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 4. AUTH TO PROFILE TRIGGER FUNCTION
-- ====================================================================
-- Extracts metadata passed from the client during signup and inserts 
-- a clean participant record into the public.profiles table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile record
  INSERT INTO public.profiles (
    id,
    full_name,
    nickname,
    club,
    phone_number,
    whatsapp_number,
    social_media_page,
    photo_url,
    status,
    document_url,
    document_name,
    tournament_type
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'fullName', 
      split_part(NEW.email, '@', 1),
      'Tournament Player'
    ),
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'club',
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phoneNumber', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', NEW.raw_user_meta_data->>'whatsappNumber'),
    COALESCE(NEW.raw_user_meta_data->>'social_media_page', NEW.raw_user_meta_data->>'socialMediaPage'),
    COALESCE(NEW.raw_user_meta_data->>'photo_url', NEW.raw_user_meta_data->>'photoUrl'),
    'pending', -- All newly registered users start with 'pending' status
    COALESCE(NEW.raw_user_meta_data->>'document_url', NEW.raw_user_meta_data->>'documentUrl'),
    COALESCE(NEW.raw_user_meta_data->>'document_name', NEW.raw_user_meta_data->>'documentName'),
    COALESCE(NEW.raw_user_meta_data->>'tournament_type', NEW.raw_user_meta_data->>'tournamentType')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nickname = EXCLUDED.nickname,
    club = EXCLUDED.club,
    phone_number = EXCLUDED.phone_number,
    whatsapp_number = EXCLUDED.whatsapp_number,
    social_media_page = EXCLUDED.social_media_page,
    photo_url = EXCLUDED.photo_url,
    document_url = EXCLUDED.document_url,
    document_name = EXCLUDED.document_name,
    tournament_type = EXCLUDED.tournament_type;

  RETURN NEW;
END;
$$;

-- ====================================================================
-- 5. DECLARE TRIGGER ON AUTH.USERS
-- ====================================================================
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 6. CONFIGURE ROW LEVEL SECURITY & POLICIES FOR PROFILES
-- ====================================================================
-- Enable RLS and define fully permissive policies to guarantee unrestricted access on all environments.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public delete access for profiles" ON public.profiles;

CREATE POLICY "Allow public read access for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for profiles" ON public.profiles FOR DELETE USING (true);

-- ====================================================================
-- 7. DEFINE TOURNAMENT TYPES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tournament_types (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for tournament_types
ALTER TABLE public.tournament_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for tournament_types" ON public.tournament_types;
DROP POLICY IF EXISTS "Allow public insert access for tournament_types" ON public.tournament_types;
DROP POLICY IF EXISTS "Allow public update access for tournament_types" ON public.tournament_types;
DROP POLICY IF EXISTS "Allow public delete access for tournament_types" ON public.tournament_types;

CREATE POLICY "Allow public read access for tournament_types" ON public.tournament_types FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for tournament_types" ON public.tournament_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for tournament_types" ON public.tournament_types FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for tournament_types" ON public.tournament_types FOR DELETE USING (true);

-- Seed initial tournament types
INSERT INTO public.tournament_types (name, is_active)
VALUES 
  ('Soccer', false),
  ('Snooker', true),
  ('Table Tennis', false)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- 8. DEFINE PLAYERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  player_name TEXT,
  nickname TEXT,
  club TEXT,
  seed INT DEFAULT 1,
  photo_url TEXT,
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  total_points INT DEFAULT 0,
  highest_break INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  tournament_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for players" ON public.players;
DROP POLICY IF EXISTS "Allow public insert access for players" ON public.players;
DROP POLICY IF EXISTS "Allow public update access for players" ON public.players;
DROP POLICY IF EXISTS "Allow public delete access for players" ON public.players;

CREATE POLICY "Allow public read access for players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for players" ON public.players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for players" ON public.players FOR DELETE USING (true);

-- ====================================================================
-- 9. DEFINE ROUND OF 32 TABLE
-- ====================================================================
-- Re-create round_of_32 table to ensure player columns are flexible TEXT fields, allowing both UUID profiles and string demo player IDs without foreign-key blocks.
DROP TABLE IF EXISTS public.round_of_32 CASCADE;

CREATE TABLE public.round_of_32 (
  id TEXT PRIMARY KEY, -- e.g. 'M1', 'M2', etc.
  label TEXT,
  player1_id TEXT,
  player2_id TEXT,
  score1 INT DEFAULT NULL,
  score2 INT DEFAULT NULL,
  points1 INT DEFAULT NULL,
  points2 INT DEFAULT NULL,
  break1 INT DEFAULT NULL,
  break2 INT DEFAULT NULL,
  winner_id TEXT,
  loser_id TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_time TEXT,
  day INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for round_of_32
ALTER TABLE public.round_of_32 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for round_of_32" ON public.round_of_32;
DROP POLICY IF EXISTS "Allow public insert access for round_of_32" ON public.round_of_32;
DROP POLICY IF EXISTS "Allow public update access for round_of_32" ON public.round_of_32;
DROP POLICY IF EXISTS "Allow public delete access for round_of_32" ON public.round_of_32;

CREATE POLICY "Allow public read access for round_of_32" ON public.round_of_32 FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for round_of_32" ON public.round_of_32 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for round_of_32" ON public.round_of_32 FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for round_of_32" ON public.round_of_32 FOR DELETE USING (true);

-- ====================================================================
-- 10. DEFINE TOURNAMENT ROUNDS STATUS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rounds (
  stage TEXT PRIMARY KEY, -- e.g. 'Round of 32', 'Round of 16', 'Quarter finals', etc.
  status TEXT NOT NULL CHECK (status IN ('active', 'not started', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for rounds to ensure complete unrestricted access
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow public insert access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow public update access for rounds" ON public.rounds;
DROP POLICY IF EXISTS "Allow public delete access for rounds" ON public.rounds;

CREATE POLICY "Allow public read access for rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for rounds" ON public.rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for rounds" ON public.rounds FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for rounds" ON public.rounds FOR DELETE USING (true);

-- Seed initial stages
INSERT INTO public.rounds (stage, status) VALUES
  ('Round of 32', 'not started'),
  ('Round of 16', 'not started'),
  ('Quarter finals', 'not started'),
  ('Semi finals', 'not started'),
  ('Final', 'not started')
ON CONFLICT (stage) DO UPDATE SET status = EXCLUDED.status;

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.rounds IS 'Stores stages of the tournament and their corresponding active, upcoming, or ended status.';

-- ====================================================================
-- SUCCESS: All tables, triggers, and sync systems are fully initialized!
-- ====================================================================
