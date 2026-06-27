-- ==========================================
-- STEP 1: CLEAN UP - Drop all existing tables and policies
-- Run this FIRST to avoid "already exists" errors
-- ==========================================

DROP TABLE IF EXISTS public.user_votes CASCADE;
DROP TABLE IF EXISTS public.rangoli_entries CASCADE;
DROP TABLE IF EXISTS public.devotional_songs CASCADE;
DROP TABLE IF EXISTS public.countdowns CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.donations_log CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Drop old RPC functions
DROP FUNCTION IF EXISTS increment_rangoli_votes(UUID, INTEGER);

-- Remove from realtime publication (ignore errors if not added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
