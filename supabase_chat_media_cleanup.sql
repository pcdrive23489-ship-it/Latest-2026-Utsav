-- ============================================================================
-- UtsavConnect — Automatic Chat-Media Cleanup (audit + webhook trigger)
-- ----------------------------------------------------------------------------
-- When a `messages` row is deleted, soft-deleted (media_url -> null), or has its
-- media replaced, the now-orphaned file in the `uploads` Storage bucket is
-- removed by the `cleanup-chat-media` Edge Function. A database webhook (this
-- trigger) calls that function asynchronously via pg_net. Every action is
-- recorded in public.storage_cleanup_log by the function.
--
-- Run AFTER supabase_schema.sql and supabase_security.sql (depends on
-- public.is_admin()). Non-destructive and safe to re-run.
--
-- DEPLOY CHECKLIST (one-time, see notes at the bottom):
--   1. supabase functions deploy cleanup-chat-media
--   2. supabase secrets set CLEANUP_WEBHOOK_SECRET=<random-string>
--   3. Store the function URL + the same secret in Vault (SQL at the bottom).
-- ============================================================================

-- Extensions used by the webhook (pre-installed on Supabase; enable if missing).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----------------------------------------------------------------------------
-- 1. AUDIT LOG — one row per automatic cleanup decision.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_cleanup_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket       TEXT NOT NULL,
    path         TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_id    TEXT,
    action       TEXT NOT NULL,   -- UPDATE | DELETE
    status       TEXT NOT NULL,   -- deleted | skipped_referenced | error
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Admins can read the audit trail. Writes come only from the Edge Function via
-- the service role, which bypasses RLS — so no INSERT policy is granted to clients.
DROP POLICY IF EXISTS "cleanup_log_select_admin" ON public.storage_cleanup_log;
CREATE POLICY "cleanup_log_select_admin" ON public.storage_cleanup_log
    FOR SELECT TO authenticated USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. WEBHOOK TRIGGER — notify the Edge Function only when media is orphaned.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_chat_media_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url TEXT;
  secret TEXT;
BEGIN
  -- Skip when no file could have been orphaned.
  IF TG_OP = 'DELETE' AND OLD.media_url IS NULL THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
     AND (OLD.media_url IS NULL OR OLD.media_url IS NOT DISTINCT FROM NEW.media_url) THEN
    RETURN NEW;
  END IF;

  -- Read the function URL + shared secret from Vault (never hardcode secrets).
  SELECT decrypted_secret INTO fn_url FROM vault.decrypted_secrets WHERE name = 'cleanup_fn_url';
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'cleanup_webhook_secret';

  -- If not configured yet, do nothing rather than block the user's write.
  IF fn_url IS NULL OR secret IS NULL THEN
    RAISE WARNING 'chat-media cleanup not configured (missing vault secrets); skipping';
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Fire-and-forget POST (pg_net queues it; the user's transaction is not blocked).
  PERFORM net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', secret
    ),
    body    := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', to_jsonb(OLD)
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_media_cleanup ON public.messages;
CREATE TRIGGER trg_chat_media_cleanup
  AFTER UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_media_cleanup();

-- ============================================================================
-- 3. ONE-TIME CONFIGURATION (run once, with your real values)
-- ----------------------------------------------------------------------------
-- After `supabase functions deploy cleanup-chat-media`, register the function
-- URL and a shared secret in Vault. Use the SAME secret you set with
-- `supabase secrets set CLEANUP_WEBHOOK_SECRET=...`.
--
--   select vault.create_secret(
--     'https://<your-project-ref>.supabase.co/functions/v1/cleanup-chat-media',
--     'cleanup_fn_url'
--   );
--   select vault.create_secret('<your-random-shared-secret>', 'cleanup_webhook_secret');
--
-- To rotate later: select vault.update_secret(<uuid>, '<new-value>');
-- ============================================================================
