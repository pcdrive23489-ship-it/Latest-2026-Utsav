-- ============================================================================
-- UtsavConnect — Security Lockdown Migration
-- ----------------------------------------------------------------------------
-- Replaces the permissive `USING (true)` RLS policies from supabase_schema.sql
-- with real, role-aware authorization enforced in Postgres. This is the ONLY
-- enforcement layer because the app is a static client-only build (no server,
-- no service-role key).
--
-- NON-DESTRUCTIVE: does not drop tables or data. Run this AFTER supabase_schema.sql
-- in the Supabase SQL editor. Safe to re-run (idempotent).
-- ============================================================================

-- ============================================================================
-- 1a. HELPER FUNCTIONS (SECURITY DEFINER so they bypass RLS and avoid
--     recursive policy evaluation when referenced inside users policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE uid = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_role() IN ('admin', 'super-admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_role() = 'super-admin';
$$;

-- ============================================================================
-- 1b. PROFILE BOOTSTRAP — auto-create the public.users row on auth signup.
--     Role/status is assigned server-side so a client can never insert a
--     privileged row. First user ever becomes super-admin/approved.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT count(*) = 0 INTO is_first FROM public.users;

  INSERT INTO public.users (uid, email, first_name, last_name, role, status)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, 'unknown'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    CASE WHEN is_first THEN 'super-admin' ELSE 'member' END,
    CASE WHEN is_first THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (uid) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 1c. PRIVILEGE PROTECTION — members can edit their own profile fields, but
--     never their own role/status. Only super-admins can grant super-admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Non-admins cannot change role or status at all.
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
  END IF;

  -- Only super-admins may assign the super-admin role.
  IF NEW.role = 'super-admin' AND OLD.role <> 'super-admin' AND NOT public.is_super_admin() THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_privileges_trigger ON public.users;
CREATE TRIGGER protect_user_privileges_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileges();

-- ============================================================================
-- 1d. RLS POLICIES — drop the old permissive policies, create secure ones.
--     Default-deny: any operation without a matching policy is rejected.
-- ============================================================================

-- ---- users -----------------------------------------------------------------
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "users_select_self_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_self_or_admin" ON public.users;

CREATE POLICY "users_select_self_or_admin" ON public.users
  FOR SELECT USING (uid = auth.uid()::text OR public.is_admin());
-- INSERT: none. Rows are created only by the handle_new_user() definer trigger.
CREATE POLICY "users_update_self_or_admin" ON public.users
  FOR UPDATE USING (uid = auth.uid()::text OR public.is_admin());
-- DELETE: none. Accounts are suspended (status = 'rejected'), never deleted.

-- ---- messages --------------------------------------------------------------
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;

CREATE POLICY "messages_select_authenticated" ON public.messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid()::text);
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()::text);
-- Reactions on other users' messages go through toggle_message_reaction() (1e).
-- DELETE: none. Messages are soft-deleted via UPDATE by their author.

-- ---- settings --------------------------------------------------------------
DROP POLICY IF EXISTS "Settings are viewable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Anyone can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_admin" ON public.settings;
DROP POLICY IF EXISTS "settings_update_admin" ON public.settings;

CREATE POLICY "settings_select_authenticated" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_insert_admin" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE TO authenticated USING (public.is_admin());

-- ---- events ----------------------------------------------------------------
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;
DROP POLICY IF EXISTS "Anyone can update events" ON public.events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.events;
DROP POLICY IF EXISTS "events_select_authenticated" ON public.events;
DROP POLICY IF EXISTS "events_insert_admin" ON public.events;
DROP POLICY IF EXISTS "events_update_admin" ON public.events;
DROP POLICY IF EXISTS "events_delete_admin" ON public.events;

CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "events_update_admin" ON public.events
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "events_delete_admin" ON public.events
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- announcements ---------------------------------------------------------
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_authenticated" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_admin" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_admin" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_admin" ON public.announcements;

CREATE POLICY "announcements_select_authenticated" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "announcements_delete_admin" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- donations_log ---------------------------------------------------------
DROP POLICY IF EXISTS "Donations are viewable by everyone" ON public.donations_log;
DROP POLICY IF EXISTS "Anyone can insert donations" ON public.donations_log;
DROP POLICY IF EXISTS "Anyone can update donations" ON public.donations_log;
DROP POLICY IF EXISTS "donations_select_admin" ON public.donations_log;
DROP POLICY IF EXISTS "donations_insert_authenticated" ON public.donations_log;
DROP POLICY IF EXISTS "donations_update_admin" ON public.donations_log;

-- Members must not read other people's donations; admins verify them.
CREATE POLICY "donations_select_admin" ON public.donations_log
  FOR SELECT TO authenticated USING (public.is_admin());
-- Logged-in users may submit; status is forced to 'pending' on insert.
CREATE POLICY "donations_insert_authenticated" ON public.donations_log
  FOR INSERT TO authenticated WITH CHECK (status = 'pending');
CREATE POLICY "donations_update_admin" ON public.donations_log
  FOR UPDATE TO authenticated USING (public.is_admin());

-- ---- collections -----------------------------------------------------------
DROP POLICY IF EXISTS "Collections are viewable by everyone" ON public.collections;
DROP POLICY IF EXISTS "Anyone can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can update collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can delete collections" ON public.collections;
DROP POLICY IF EXISTS "collections_select_authenticated" ON public.collections;
DROP POLICY IF EXISTS "collections_insert_admin" ON public.collections;
DROP POLICY IF EXISTS "collections_update_admin" ON public.collections;
DROP POLICY IF EXISTS "collections_delete_admin" ON public.collections;

CREATE POLICY "collections_select_authenticated" ON public.collections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "collections_insert_admin" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "collections_update_admin" ON public.collections
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "collections_delete_admin" ON public.collections
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- countdowns ------------------------------------------------------------
DROP POLICY IF EXISTS "Countdowns are viewable by everyone" ON public.countdowns;
DROP POLICY IF EXISTS "Anyone can insert countdowns" ON public.countdowns;
DROP POLICY IF EXISTS "Anyone can update countdowns" ON public.countdowns;
DROP POLICY IF EXISTS "Anyone can delete countdowns" ON public.countdowns;
DROP POLICY IF EXISTS "countdowns_select_authenticated" ON public.countdowns;
DROP POLICY IF EXISTS "countdowns_insert_admin" ON public.countdowns;
DROP POLICY IF EXISTS "countdowns_update_admin" ON public.countdowns;
DROP POLICY IF EXISTS "countdowns_delete_admin" ON public.countdowns;

CREATE POLICY "countdowns_select_authenticated" ON public.countdowns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "countdowns_insert_admin" ON public.countdowns
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "countdowns_update_admin" ON public.countdowns
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "countdowns_delete_admin" ON public.countdowns
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- devotional_songs ------------------------------------------------------
DROP POLICY IF EXISTS "Songs are viewable by everyone" ON public.devotional_songs;
DROP POLICY IF EXISTS "Anyone can insert songs" ON public.devotional_songs;
DROP POLICY IF EXISTS "Anyone can delete songs" ON public.devotional_songs;
DROP POLICY IF EXISTS "songs_select_authenticated" ON public.devotional_songs;
DROP POLICY IF EXISTS "songs_insert_own" ON public.devotional_songs;
DROP POLICY IF EXISTS "songs_delete_own_or_admin" ON public.devotional_songs;

CREATE POLICY "songs_select_authenticated" ON public.devotional_songs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "songs_insert_own" ON public.devotional_songs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "songs_delete_own_or_admin" ON public.devotional_songs
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text OR public.is_admin());

-- ---- rangoli_entries -------------------------------------------------------
DROP POLICY IF EXISTS "Rangoli entries are viewable by everyone" ON public.rangoli_entries;
DROP POLICY IF EXISTS "Anyone can insert rangoli entries" ON public.rangoli_entries;
DROP POLICY IF EXISTS "Anyone can update rangoli entries" ON public.rangoli_entries;
DROP POLICY IF EXISTS "Anyone can delete rangoli entries" ON public.rangoli_entries;
DROP POLICY IF EXISTS "rangoli_select_authenticated" ON public.rangoli_entries;
DROP POLICY IF EXISTS "rangoli_insert_admin" ON public.rangoli_entries;
DROP POLICY IF EXISTS "rangoli_update_admin" ON public.rangoli_entries;
DROP POLICY IF EXISTS "rangoli_delete_admin" ON public.rangoli_entries;

CREATE POLICY "rangoli_select_authenticated" ON public.rangoli_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rangoli_insert_admin" ON public.rangoli_entries
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
-- Vote counts are changed only by cast_rangoli_vote() (definer, bypasses RLS).
CREATE POLICY "rangoli_update_admin" ON public.rangoli_entries
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "rangoli_delete_admin" ON public.rangoli_entries
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---- user_votes ------------------------------------------------------------
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.user_votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON public.user_votes;
DROP POLICY IF EXISTS "Anyone can update votes" ON public.user_votes;
DROP POLICY IF EXISTS "votes_select_own" ON public.user_votes;

CREATE POLICY "votes_select_own" ON public.user_votes
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
-- INSERT/UPDATE: none. Votes are written only by cast_rangoli_vote() (1e).

-- ============================================================================
-- 1e. SECURE RPCs — replace exploitable / non-atomic client operations.
-- ============================================================================

-- Reactions: toggle the caller's id under an emoji on any message, without
-- granting a broad UPDATE policy on other users' messages.
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(message_id UUID, emoji TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid TEXT := auth.uid()::text;
  current JSONB;
  users_arr JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(reactions, '{}'::jsonb) INTO current
  FROM public.messages WHERE id = message_id FOR UPDATE;

  IF current IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  users_arr := COALESCE(current->emoji, '[]'::jsonb);

  IF users_arr @> to_jsonb(uid) THEN
    -- Remove the caller's reaction.
    users_arr := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(users_arr) elem
      WHERE elem <> to_jsonb(uid)
    );
  ELSE
    -- Add the caller's reaction.
    users_arr := users_arr || to_jsonb(uid);
  END IF;

  IF jsonb_array_length(users_arr) = 0 THEN
    current := current - emoji;
  ELSE
    current := jsonb_set(current, ARRAY[emoji], users_arr, true);
  END IF;

  UPDATE public.messages SET reactions = current WHERE id = message_id;
END;
$$;

-- Voting: one vote per user, atomic. Replaces increment_rangoli_votes(uuid,int),
-- which accepted an arbitrary amount and could inflate any entry.
DROP FUNCTION IF EXISTS public.increment_rangoli_votes(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.cast_rangoli_vote(entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid TEXT := auth.uid()::text;
  prev_entry UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT rangoli_entry_id INTO prev_entry
  FROM public.user_votes WHERE user_id = uid FOR UPDATE;

  IF prev_entry = entry_id THEN
    RETURN; -- Already voted for this entry; no-op.
  END IF;

  IF prev_entry IS NOT NULL THEN
    -- Switching vote: move the count from the old entry to the new one.
    UPDATE public.rangoli_entries SET votes = GREATEST(votes - 1, 0) WHERE id = prev_entry;
    UPDATE public.rangoli_entries SET votes = votes + 1 WHERE id = entry_id;
    UPDATE public.user_votes SET rangoli_entry_id = entry_id WHERE user_id = uid;
  ELSE
    -- First vote.
    UPDATE public.rangoli_entries SET votes = votes + 1 WHERE id = entry_id;
    INSERT INTO public.user_votes (user_id, rangoli_entry_id) VALUES (uid, entry_id);
  END IF;
END;
$$;

-- ============================================================================
-- 1f. PRE-SEED default rows so non-admin reads never trigger a (now-blocked)
--     client-side seed write. Mirrors the defaults in src/services/database.ts.
-- ============================================================================

INSERT INTO public.settings (id, decoration, prasad, programs, logistics, qr_code_url, upi_id)
VALUES ('donations', 40, 30, 20, 10, '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, visible_to_members)
VALUES ('finance', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, is_live)
VALUES ('live_stream', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, finance_data)
VALUES ('finance_data', '{
  "assets": [
    {"item": "Cash in Hand", "amount": 50000},
    {"item": "Bank Balance", "amount": 250000},
    {"item": "Receivables (Pending Collections)", "amount": 25000}
  ],
  "liabilities": [
    {"item": "Advance from Sponsors", "amount": 100000},
    {"item": "Unpaid Vendor Bills", "amount": 45000}
  ],
  "income": [
    {"item": "Donations", "amount": 250000},
    {"item": "Sponsorships", "amount": 100000}
  ],
  "expenses": [
    {"item": "Mandap Decoration", "amount": 80000},
    {"item": "Prasad & Bhog", "amount": 60000},
    {"item": "Cultural Programs", "amount": 45000},
    {"item": "Logistics", "amount": 20000}
  ]
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, rangoli_data)
VALUES ('rangoli_competition', '{
  "prizes": [
    {"rank": "1st Place", "prize": "Gift Hamper & Trophy"},
    {"rank": "2nd Place", "prize": "Gift Voucher & Medal"},
    {"rank": "3rd Place", "prize": "Certificate & Medal"}
  ],
  "announcementDate": "September 17th, 2024",
  "criteria": "Highest number of public votes."
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed demo announcements / collections / countdowns / rangoli entries only if
-- those tables are still empty (preserves any real data already present).
INSERT INTO public.announcements (title, content)
SELECT * FROM (VALUES
  ('Evening Aarti', 'The evening aarti will begin at 7:00 PM today at the main stage. All are welcome to join.'),
  ('Prasad Distribution', 'Prasad will be distributed near the exit gate from 8:00 PM onwards. Please form a queue.'),
  ('Cultural Program Schedule Change', 'The dance performance originally scheduled for 6:00 PM has been moved to 8:30 PM.')
) AS seed(title, content)
WHERE NOT EXISTS (SELECT 1 FROM public.announcements);

INSERT INTO public.collections (section, name, date, expected, received, status)
SELECT * FROM (VALUES
  ('A Wing', 'Ramesh Gupta', '2024-09-08', 5000, 5000, 'Paid'),
  ('A Wing', 'Sita Desai', '2024-09-08', 2500, 2500, 'Paid'),
  ('B Wing', 'Vikram Singh', '2024-09-09', 10000, 0, 'Pending')
) AS seed(section, name, date, expected, received, status)
WHERE NOT EXISTS (SELECT 1 FROM public.collections);

INSERT INTO public.countdowns (name, target_date)
SELECT 'Prana Pratishthapana', (now() + interval '10 days')::text
WHERE NOT EXISTS (SELECT 1 FROM public.countdowns);

INSERT INTO public.rangoli_entries (artist_name, image_url, artist_image_url, votes, description)
SELECT * FROM (VALUES
  ('The Creative Crew', 'https://picsum.photos/600/600?random=1', 'https://picsum.photos/100/100?random=a', 128, 'A vibrant depiction of Lord Ganesha.'),
  ('Artistic Angels', 'https://picsum.photos/600/600?random=2', 'https://picsum.photos/100/100?random=b', 95, 'Modern take on a classic design.'),
  ('Colors of Joy', 'https://picsum.photos/600/600?random=3', 'https://picsum.photos/100/100?random=c', 210, 'Inspired by nature''s patterns.')
) AS seed(artist_name, image_url, artist_image_url, votes, description)
WHERE NOT EXISTS (SELECT 1 FROM public.rangoli_entries);

-- ============================================================================
-- 1g. STORAGE policies for the 'uploads' bucket.
--     Public read (public URLs are used for QR / chat media / proofs),
--     authenticated write.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "uploads_public_read" ON storage.objects;
DROP POLICY IF EXISTS "uploads_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "uploads_authenticated_delete" ON storage.objects;

CREATE POLICY "uploads_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "uploads_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "uploads_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "uploads_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'uploads');

-- ============================================================================
-- Done. Realtime publication (messages, settings) is unchanged from
-- supabase_schema.sql; RLS now also governs what realtime delivers.
-- ============================================================================
