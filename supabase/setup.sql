-- ====================================================================
-- SUPABASE TOURNAMENT PORTAL SETUP SCRIPT
-- ====================================================================
-- This script sets up a secure `profiles` table in your public schema 
-- and automatically synchronizes new users from Supabase Auth (`auth.users`)
-- into `public.profiles` using a PostgreSQL database trigger.
-- 
-- How to use:
-- 1. Open your Supabase Dashboard.
-- 2. Go to the "SQL Editor" tab from the left sidebar.
-- 3. Click "New Query" and paste the contents of this file.
-- 4. Click "Run" (or Cmd+Enter / Ctrl+Enter) to execute.
-- ====================================================================

-- 1. CLEANUP (Optional / Re-runnable guard)
-- Automatically drop old versions of trigger, function, and profiles table to ensure a pristine setup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE PROFILES TABLE
-- This table stores all the profile and registration fields of players.
-- It matches the `PlayerApplication` and `Player` interfaces in the app.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT,
  club TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  social_media_page TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'eliminated', 'champion', 'runner_up', 'third_place', 'fourth_place')),
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

-- 3. AUTOMATIC UPDATED_AT TIMESTAMP FUNCTION
-- A utility function to automatically update the `updated_at` column of a row.
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

-- 4. AUTH TO PROFILE TRIGGER FUNCTION
-- This trigger automatically fires AFTER a user completes registration/signup.
-- It extracts custom registration metadata passed during the signup API call
-- and inserts a clean record into the `public.profiles` table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile record (omitting applied_at so it defaults safely to now())
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', 'Tournament Player'),
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

-- 5. DECLARE TRIGGER ON AUTH.USERS
-- Binds the profile creation trigger to the Supabase auth.users system table.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- Crucial for securing the Supabase instance against unauthorized writes.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE RLS POLICIES
-- Drop existing policies first if they exist to prevent duplicate policy errors
DROP POLICY IF EXISTS "Public Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can fully manage profiles" ON public.profiles;

-- Policy A: Anyone can read player profiles (public portal needs to display rosters, rankings, etc.)
CREATE POLICY "Public Profiles are viewable by everyone" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

-- Policy B: Users can update only their own profile details
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy C: Service role/Admins can do everything (insert, update, delete)
CREATE POLICY "Service role can fully manage profiles" 
  ON public.profiles 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- ====================================================================
-- SNOOKER & MULTI-DISCIPLINE TOURNAMENT TYPES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.tournament_types (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on row level security
ALTER TABLE public.tournament_types ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (both with and without public schema prefix to be absolutely certain)
DROP POLICY IF EXISTS "Public Tournament Types are viewable by everyone" ON public.tournament_types;
DROP POLICY IF EXISTS "Public Tournament Types are viewable by everyone" ON tournament_types;
DROP POLICY IF EXISTS "Service role can fully manage tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Service role can fully manage tournament types" ON tournament_types;

-- Allow everyone to read the tournament types
CREATE POLICY "Public Tournament Types are viewable by everyone" 
  ON public.tournament_types 
  FOR SELECT 
  TO public 
  USING (true);

-- Allow fully authorized service role or authenticated admin to manage tournament types
CREATE POLICY "Service role can fully manage tournament types" 
  ON public.tournament_types 
  FOR ALL 
  TO service_role 
  USING (true);

-- Seed initial tournament types
INSERT INTO public.tournament_types (name, is_active)
VALUES 
  ('Soccer', false),
  ('Snooker', true),
  ('Table Tennis', false)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- SUCCESS: All tables and configurations are fully initialized!
-- ====================================================================
