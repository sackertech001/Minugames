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
-- 8.1 TRIGGER TO PROPAGATE PROFILE UPDATES TO PLAYERS TABLE
-- ====================================================================
-- Automatically synchronizes name, nickname, club, photo_url, and tournament_type 
-- from profiles to the players table when a profile is updated.
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Try to update the matching row in players table if it already exists
  UPDATE public.players
  SET 
    name = NEW.full_name,
    player_name = NEW.full_name,
    nickname = NEW.nickname,
    club = NEW.club,
    photo_url = NEW.photo_url,
    tournament_type = NEW.tournament_type
  WHERE profile_id = NEW.id;

  -- 2. If profile is approved/active but no player row exists, auto-insert it
  IF NEW.status IN ('approved', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place') THEN
    IF NOT EXISTS (SELECT 1 FROM public.players WHERE profile_id = NEW.id) THEN
      INSERT INTO public.players (
        profile_id,
        name,
        player_name,
        nickname,
        club,
        seed,
        photo_url,
        status,
        tournament_type
      ) VALUES (
        NEW.id,
        NEW.full_name,
        NEW.full_name,
        NEW.nickname,
        NEW.club,
        COALESCE(NEW.seed, 1),
        NEW.photo_url,
        'active',
        NEW.tournament_type
      )
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  ELSIF NEW.status IN ('pending', 'rejected') THEN
    -- 3. If profile status is reverted to pending/rejected, automatically remove from players table
    DELETE FROM public.players WHERE profile_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_update();

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
-- 11. APPOINTMENT BOOKINGS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  interest_type TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define permissive policies for public insertion and admin reads
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow admin read for appointments" ON public.appointments;

CREATE POLICY "Allow public insert for appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read for appointments" ON public.appointments FOR SELECT USING (true);

-- ====================================================================
-- 12. CREATE ROUND OF 16 TABLE WITH POLICY ACCESSIBILITY
-- ====================================================================
DROP TABLE IF EXISTS public.round_of_16 CASCADE;

CREATE TABLE public.round_of_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number BETWEEN 1 AND 8),
  
  -- Foreign keys referencing profiles table (nullable to allow TBD slots)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fallback names for rendering matches before profiles link or for demo slots
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  
  -- Match Scores (number of frames won in Snooker)
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  
  -- Snooker specific statistics
  player1_highest_break INT DEFAULT 0,
  player2_highest_break INT DEFAULT 0,
  
  -- Match standing/outcome
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'bye')),
  
  -- Logistics & Metadata
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '1 day'),
  table_number INT,
  referee_name TEXT,
  tournament_type TEXT DEFAULT 'Snooker',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 2. ENABLE ROW LEVEL SECURITY & DEFINE PERMISSIVE POLICIES
-- ====================================================================
ALTER TABLE public.round_of_16 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for round_of_16" ON public.round_of_16;
DROP POLICY IF EXISTS "Allow public insert access for round_of_16" ON public.round_of_16;
DROP POLICY IF EXISTS "Allow public update access for round_of_16" ON public.round_of_16;
DROP POLICY IF EXISTS "Allow public delete access for round_of_16" ON public.round_of_16;

CREATE POLICY "Allow public read access for round_of_16" ON public.round_of_16 FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for round_of_16" ON public.round_of_16 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for round_of_16" ON public.round_of_16 FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for round_of_16" ON public.round_of_16 FOR DELETE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE TRIGGER update_round_of_16_updated_at
  BEFORE UPDATE ON public.round_of_16
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.round_of_16 IS 'Stores all 8 individual bracket matches and frames for the Round of 16 tournament stage.';

-- ====================================================================
-- 3. SEED DUMMY DATA FOR ALL 8 ROUND OF 16 MATCHES
-- ====================================================================
INSERT INTO public.round_of_16 (
  match_number,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_score,
  player2_score,
  player1_highest_break,
  player2_highest_break,
  winner_id,
  winner_name,
  status,
  scheduled_time,
  table_number,
  referee_name,
  tournament_type
) VALUES 
  -- Match 1: Completed
  (
    1, 
    NULL, NULL, 
    'Mark Selby', 'Mark Allen', 
    4, 2, 
    124, 79, 
    NULL, 'Mark Selby', 
    'completed', 
    timezone('utc'::text, now() - interval '2 hours'), 
    1, 
    'Jan Verhaas', 
    'Snooker'
  ),
  
  -- Match 2: Completed
  (
    2, 
    NULL, NULL, 
    'Shaun Murphy', 'Barry Hawkins', 
    4, 1, 
    108, 62, 
    NULL, 'Shaun Murphy', 
    'completed', 
    timezone('utc'::text, now() - interval '1.5 hours'), 
    2, 
    'Desislava Bozhilova', 
    'Snooker'
  ),
  
  -- Match 3: Ongoing
  (
    3, 
    NULL, NULL, 
    'Kyren Wilson', 'Ali Carter', 
    2, 2, 
    89, 93, 
    NULL, NULL, 
    'ongoing', 
    timezone('utc'::text, now() - interval '30 minutes'), 
    3, 
    'Paul Collier', 
    'Snooker'
  ),
  
  -- Match 4: Ongoing
  (
    4, 
    NULL, NULL, 
    'Ding Junhui', 'John Higgins', 
    1, 3, 
    55, 112, 
    NULL, NULL, 
    'ongoing', 
    timezone('utc'::text, now() - interval '15 minutes'), 
    4, 
    'Marcel Eckardt', 
    'Snooker'
  ),
  
  -- Match 5: Scheduled
  (
    5, 
    NULL, NULL, 
    'Ronnie O''Sullivan', 'Luca Brecel', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '2 hours'), 
    1, 
    'Jan Verhaas', 
    'Snooker'
  ),
  
  -- Match 6: Scheduled
  (
    6, 
    NULL, NULL, 
    'Judd Trump', 'Gary Wilson', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '4 hours'), 
    2, 
    'Desislava Bozhilova', 
    'Snooker'
  ),
  
  -- Match 7: Scheduled
  (
    7, 
    NULL, NULL, 
    'Jack Lisowski', 'Neil Robertson', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '1 day'), 
    3, 
    'Olivier Marteel', 
    'Snooker'
  ),
  
  -- Match 8: Scheduled
  (
    8, 
    NULL, NULL, 
    'Mark Williams', 'Stuart Bingham', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '1 day + 2 hours'), 
    4, 
    'Ben Williams', 
    'Snooker'
  )
ON CONFLICT (match_number) DO NOTHING;


ALTER TABLE round_of_16
  ADD COLUMN player1_set1 INT DEFAULT 0,
  ADD COLUMN player1_set2 INT DEFAULT 0,
  ADD COLUMN player1_set3 INT DEFAULT 0,
  ADD COLUMN player2_set1 INT DEFAULT 0,
  ADD COLUMN player2_set2 INT DEFAULT 0,
  ADD COLUMN player2_set3 INT DEFAULT 0;

-- ====================================================================
-- 14. CREATE QUARTER FINALS TABLE WITH POLICY ACCESSIBILITY
-- ====================================================================
DROP TABLE IF EXISTS public.quarter_finals CASCADE;

CREATE TABLE public.quarter_finals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number BETWEEN 1 AND 4),
  
  -- Foreign keys referencing profiles table (nullable to allow TBD slots)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fallback names for rendering matches before profiles link or for demo slots
  player1_name TEXT DEFAULT 'TBD' NOT NULL,
  player2_name TEXT DEFAULT 'TBD' NOT NULL,
  
  -- Match Scores (number of frames won in Snooker)
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  
  -- Frame points/sets
  player1_set1 INT DEFAULT 0,
  player1_set2 INT DEFAULT 0,
  player1_set3 INT DEFAULT 0,
  player2_set1 INT DEFAULT 0,
  player2_set2 INT DEFAULT 0,
  player2_set3 INT DEFAULT 0,

  -- Snooker specific statistics
  player1_highest_break INT DEFAULT 0,
  player2_highest_break INT DEFAULT 0,
  
  -- Match standing/outcome
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'bye')),
  
  -- Logistics & Metadata
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '2 days'),
  table_number INT,
  referee_name TEXT,
  tournament_type TEXT DEFAULT 'Snooker',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for quarter_finals
ALTER TABLE public.quarter_finals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for quarter_finals" ON public.quarter_finals;
DROP POLICY IF EXISTS "Allow public insert access for quarter_finals" ON public.quarter_finals;
DROP POLICY IF EXISTS "Allow public update access for quarter_finals" ON public.quarter_finals;
DROP POLICY IF EXISTS "Allow public delete access for quarter_finals" ON public.quarter_finals;

CREATE POLICY "Allow public read access for quarter_finals" ON public.quarter_finals FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for quarter_finals" ON public.quarter_finals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for quarter_finals" ON public.quarter_finals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for quarter_finals" ON public.quarter_finals FOR DELETE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE TRIGGER update_quarter_finals_updated_at
  BEFORE UPDATE ON public.quarter_finals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.quarter_finals IS 'Stores all 4 individual bracket matches and frames for the Quarter Finals tournament stage.';

-- SEED DUMMY DATA FOR ALL 4 QUARTER FINALS MATCHES
INSERT INTO public.quarter_finals (
  match_number,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_score,
  player2_score,
  player1_highest_break,
  player2_highest_break,
  winner_id,
  winner_name,
  status,
  scheduled_time,
  table_number,
  referee_name,
  tournament_type
) VALUES 
  -- Match 1: TBD / Scheduled
  (
    1, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '2 days'), 
    1, 
    'Jan Verhaas', 
    'Snooker'
  ),
  -- Match 2: TBD / Scheduled
  (
    2, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '2 days + 2 hours'), 
    2, 
    'Desislava Bozhilova', 
    'Snooker'
  ),
  -- Match 3: TBD / Scheduled
  (
    3, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '2 days + 4 hours'), 
    3, 
    'Paul Collier', 
    'Snooker'
  ),
  -- Match 4: TBD / Scheduled
  (
    4, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '3 days'), 
    4, 
    'Marcel Eckardt', 
    'Snooker'
  )
ON CONFLICT (match_number) DO NOTHING;

-- ====================================================================
-- 15. CREATE SEMI FINALS TABLE WITH POLICY ACCESSIBILITY
-- ====================================================================
DROP TABLE IF EXISTS public.semi_finals CASCADE;

CREATE TABLE public.semi_finals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number BETWEEN 1 AND 2),
  
  -- Foreign keys referencing profiles table (nullable to allow TBD slots)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fallback names for rendering matches before profiles link or for demo slots
  player1_name TEXT DEFAULT 'TBD' NOT NULL,
  player2_name TEXT DEFAULT 'TBD' NOT NULL,
  
  -- Match Scores (number of frames won in Snooker)
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  
  -- Frame points/sets
  player1_set1 INT DEFAULT 0,
  player1_set2 INT DEFAULT 0,
  player1_set3 INT DEFAULT 0,
  player2_set1 INT DEFAULT 0,
  player2_set2 INT DEFAULT 0,
  player2_set3 INT DEFAULT 0,

  -- Snooker specific statistics
  player1_highest_break INT DEFAULT 0,
  player2_highest_break INT DEFAULT 0,
  
  -- Match standing/outcome
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'bye')),
  
  -- Logistics & Metadata
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '3 days'),
  table_number INT,
  referee_name TEXT,
  tournament_type TEXT DEFAULT 'Snooker',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for semi_finals
ALTER TABLE public.semi_finals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for semi_finals" ON public.semi_finals;
DROP POLICY IF EXISTS "Allow public insert access for semi_finals" ON public.semi_finals;
DROP POLICY IF EXISTS "Allow public update access for semi_finals" ON public.semi_finals;
DROP POLICY IF EXISTS "Allow public delete access for semi_finals" ON public.semi_finals;

CREATE POLICY "Allow public read access for semi_finals" ON public.semi_finals FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for semi_finals" ON public.semi_finals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for semi_finals" ON public.semi_finals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for semi_finals" ON public.semi_finals FOR DELETE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE TRIGGER update_semi_finals_updated_at
  BEFORE UPDATE ON public.semi_finals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.semi_finals IS 'Stores all 2 individual bracket matches and frames for the Semi Finals tournament stage.';

-- SEED DUMMY DATA FOR ALL 2 SEMI FINALS MATCHES
INSERT INTO public.semi_finals (
  match_number,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_score,
  player2_score,
  player1_highest_break,
  player2_highest_break,
  winner_id,
  winner_name,
  status,
  scheduled_time,
  table_number,
  referee_name,
  tournament_type
) VALUES 
  -- Match 1: TBD / Scheduled
  (
    1, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '3 days'), 
    1, 
    'Jan Verhaas', 
    'Snooker'
  ),
  -- Match 2: TBD / Scheduled
  (
    2, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '3 days + 3 hours'), 
    2, 
    'Desislava Bozhilova', 
    'Snooker'
  )
ON CONFLICT (match_number) DO NOTHING;

-- ====================================================================
-- 16. CREATE GRAND FINAL TABLE WITH POLICY ACCESSIBILITY
-- ====================================================================
DROP TABLE IF EXISTS public.grand_final CASCADE;

CREATE TABLE public.grand_final (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number = 1),
  
  -- Foreign keys referencing profiles table (nullable to allow TBD slots)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fallback names for rendering matches before profiles link or for demo slots
  player1_name TEXT DEFAULT 'TBD' NOT NULL,
  player2_name TEXT DEFAULT 'TBD' NOT NULL,
  
  -- Match Scores (number of frames won in Snooker)
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  
  -- Frame points/sets
  player1_set1 INT DEFAULT 0,
  player1_set2 INT DEFAULT 0,
  player1_set3 INT DEFAULT 0,
  player2_set1 INT DEFAULT 0,
  player2_set2 INT DEFAULT 0,
  player2_set3 INT DEFAULT 0,

  -- Snooker specific statistics
  player1_highest_break INT DEFAULT 0,
  player2_highest_break INT DEFAULT 0,
  
  -- Match standing/outcome
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'bye')),
  
  -- Logistics & Metadata
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '4 days'),
  table_number INT,
  referee_name TEXT,
  tournament_type TEXT DEFAULT 'Snooker',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for grand_final
ALTER TABLE public.grand_final ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for grand_final" ON public.grand_final;
DROP POLICY IF EXISTS "Allow public insert access for grand_final" ON public.grand_final;
DROP POLICY IF EXISTS "Allow public update access for grand_final" ON public.grand_final;
DROP POLICY IF EXISTS "Allow public delete access for grand_final" ON public.grand_final;

CREATE POLICY "Allow public read access for grand_final" ON public.grand_final FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for grand_final" ON public.grand_final FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for grand_final" ON public.grand_final FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for grand_final" ON public.grand_final FOR DELETE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE TRIGGER update_grand_final_updated_at
  BEFORE UPDATE ON public.grand_final
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.grand_final IS 'Stores the Grand Final match and frames for the championship stage.';

-- SEED DUMMY DATA FOR THE GRAND FINAL MATCH
INSERT INTO public.grand_final (
  match_number,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_score,
  player2_score,
  player1_highest_break,
  player2_highest_break,
  winner_id,
  winner_name,
  status,
  scheduled_time,
  table_number,
  referee_name,
  tournament_type
) VALUES 
  (
    1, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '4 days'), 
    1, 
    'Jan Verhaas', 
    'Snooker'
  )
ON CONFLICT (match_number) DO NOTHING;

-- ====================================================================
-- 17. CREATE THIRD PLACE TABLE WITH POLICY ACCESSIBILITY
-- ====================================================================
DROP TABLE IF EXISTS public.third_place CASCADE;

CREATE TABLE public.third_place (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number = 1),
  
  -- Foreign keys referencing profiles table (nullable to allow TBD slots)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fallback names for rendering matches before profiles link or for demo slots
  player1_name TEXT DEFAULT 'TBD' NOT NULL,
  player2_name TEXT DEFAULT 'TBD' NOT NULL,
  
  -- Match Scores (number of frames won in Snooker)
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  
  -- Frame points/sets
  player1_set1 INT DEFAULT 0,
  player1_set2 INT DEFAULT 0,
  player1_set3 INT DEFAULT 0,
  player2_set1 INT DEFAULT 0,
  player2_set2 INT DEFAULT 0,
  player2_set3 INT DEFAULT 0,

  -- Snooker specific statistics
  player1_highest_break INT DEFAULT 0,
  player2_highest_break INT DEFAULT 0,
  
  -- Match standing/outcome
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'bye')),
  
  -- Logistics & Metadata
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '3 days + 6 hours'),
  table_number INT,
  referee_name TEXT,
  tournament_type TEXT DEFAULT 'Snooker',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define fully permissive policies for third_place
ALTER TABLE public.third_place ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for third_place" ON public.third_place;
DROP POLICY IF EXISTS "Allow public insert access for third_place" ON public.third_place;
DROP POLICY IF EXISTS "Allow public update access for third_place" ON public.third_place;
DROP POLICY IF EXISTS "Allow public delete access for third_place" ON public.third_place;

CREATE POLICY "Allow public read access for third_place" ON public.third_place FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for third_place" ON public.third_place FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for third_place" ON public.third_place FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for third_place" ON public.third_place FOR DELETE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE TRIGGER update_third_place_updated_at
  BEFORE UPDATE ON public.third_place
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.third_place IS 'Stores the 3rd place match and frames for the championship stage.';

-- SEED DUMMY DATA FOR THE THIRD PLACE MATCH
INSERT INTO public.third_place (
  match_number,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_score,
  player2_score,
  player1_highest_break,
  player2_highest_break,
  winner_id,
  winner_name,
  status,
  scheduled_time,
  table_number,
  referee_name,
  tournament_type
) VALUES 
  (
    1, 
    NULL, NULL, 
    'TBD', 'TBD', 
    0, 0, 
    0, 0, 
    NULL, NULL, 
    'scheduled', 
    timezone('utc'::text, now() + interval '3 days + 6 hours'), 
    2, 
    'Paul Collier', 
    'Snooker'
  )
ON CONFLICT (match_number) DO NOTHING;

-- ====================================================================
-- SUCCESS: All tables, triggers, and sync systems are fully initialized!
-- ====================================================================
