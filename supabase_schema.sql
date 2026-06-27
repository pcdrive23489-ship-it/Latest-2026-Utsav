-- ==========================================
-- UtsavConnect - Corrected Supabase Schema
-- This schema matches the table/column names
-- used in src/services/database.ts
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super-admin')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);

-- ==========================================
-- 2. MESSAGES TABLE (Chat)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id TEXT NOT NULL DEFAULT 'global_chat',
    sender_id TEXT NOT NULL,
    user_name TEXT,
    user_avatar TEXT DEFAULT '',
    text TEXT DEFAULT '',
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'file')),
    media_url TEXT,
    file_name TEXT,
    reply_to TEXT,
    reply_to_content JSONB,
    is_edited BOOLEAN DEFAULT false,
    is_seen BOOLEAN DEFAULT false,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are viewable by everyone" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update messages" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete messages" ON public.messages FOR DELETE USING (true);

-- ==========================================
-- 3. SETTINGS TABLE (Key-Value Store)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    is_live BOOLEAN DEFAULT false,
    visible_to_members BOOLEAN DEFAULT false,
    decoration NUMERIC DEFAULT 40,
    prasad NUMERIC DEFAULT 30,
    programs NUMERIC DEFAULT 20,
    logistics NUMERIC DEFAULT 10,
    qr_code_url TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    finance_data JSONB,
    rangoli_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);

-- ==========================================
-- 4. EVENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete events" ON public.events FOR DELETE USING (true);

-- ==========================================
-- 5. ANNOUNCEMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete announcements" ON public.announcements FOR DELETE USING (true);

-- ==========================================
-- 6. DONATIONS LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.donations_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    donor_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    purpose TEXT DEFAULT '',
    proof_image_url TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.donations_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donations are viewable by everyone" ON public.donations_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert donations" ON public.donations_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update donations" ON public.donations_log FOR UPDATE USING (true);

-- ==========================================
-- 7. COLLECTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    expected NUMERIC DEFAULT 0,
    received NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections are viewable by everyone" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert collections" ON public.collections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update collections" ON public.collections FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete collections" ON public.collections FOR DELETE USING (true);

-- ==========================================
-- 8. COUNTDOWNS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.countdowns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    target_date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.countdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countdowns are viewable by everyone" ON public.countdowns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert countdowns" ON public.countdowns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update countdowns" ON public.countdowns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete countdowns" ON public.countdowns FOR DELETE USING (true);

-- ==========================================
-- 9. DEVOTIONAL SONGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.devotional_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    added_by TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.devotional_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Songs are viewable by everyone" ON public.devotional_songs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert songs" ON public.devotional_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete songs" ON public.devotional_songs FOR DELETE USING (true);

-- ==========================================
-- 10. RANGOLI ENTRIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.rangoli_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    artist_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    artist_image_url TEXT DEFAULT '',
    votes INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rangoli_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rangoli entries are viewable by everyone" ON public.rangoli_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rangoli entries" ON public.rangoli_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rangoli entries" ON public.rangoli_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rangoli entries" ON public.rangoli_entries FOR DELETE USING (true);

-- ==========================================
-- 11. USER VOTES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    rangoli_entry_id UUID REFERENCES public.rangoli_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are viewable by everyone" ON public.user_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert votes" ON public.user_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON public.user_votes FOR UPDATE USING (true);

-- ==========================================
-- 12. RPC FUNCTIONS
-- ==========================================

-- Increment/Decrement Rangoli votes
CREATE OR REPLACE FUNCTION increment_rangoli_votes(entry_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.rangoli_entries
  SET votes = votes + amount
  WHERE id = entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 13. ENABLE REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
