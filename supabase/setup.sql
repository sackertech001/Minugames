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
-- 6. DISABLE ROW LEVEL SECURITY (RLS) FOR PROFILES
-- ====================================================================
-- Disabling RLS ensures that player registration, profiles updates, and select queries
-- function flawlessly and without permissions errors on all environments.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 7. DEFINE TOURNAMENT TYPES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tournament_types (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable row level security on tournament_types as well for full unrestricted access
ALTER TABLE public.tournament_types DISABLE ROW LEVEL SECURITY;

-- Seed initial tournament types
INSERT INTO public.tournament_types (name, is_active)
VALUES 
  ('Soccer', false),
  ('Snooker', true),
  ('Table Tennis', false)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- SUCCESS: All tables, triggers, and sync systems are fully initialized!
-- ====================================================================
