// Supabase Edge Function: cleanup-chat-media
// ----------------------------------------------------------------------------
// Deletes orphaned chat-media files from the `uploads` Storage bucket when a
// `messages` row is deleted, soft-deleted (media_url -> null), or has its media
// replaced (media_url -> different value). Invoked by the database webhook
// trigger defined in supabase_chat_media_cleanup.sql.
//
// Safety: a file is only removed if NO active message still references it, and
// every action (deleted / skipped / error) is written to public.storage_cleanup_log.
//
// This file runs on Deno (Supabase Edge Runtime), NOT in the Next.js app. It is
// excluded from the app's tsconfig.
// ----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("CLEANUP_WEBHOOK_SECRET")!;

const BUCKET = "uploads";
// Only files under this prefix are eligible for automatic cleanup.
const MANAGED_PREFIX = "chat_media/";

// Service-role client: bypasses RLS so it can read references and write audit rows.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

/** Extract the in-bucket object path from a Supabase public Storage URL. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length));
  } catch {
    return url.slice(i + marker.length);
  }
}

async function audit(row: {
  path: string;
  source_id: unknown;
  action: string;
  status: "deleted" | "skipped_referenced" | "error";
  error?: string | null;
}) {
  const { error } = await admin.from("storage_cleanup_log").insert({
    bucket: BUCKET,
    path: row.path,
    source_table: "messages",
    source_id: row.source_id != null ? String(row.source_id) : null,
    action: row.action,
    status: row.status,
    error: row.error ?? null,
  });
  if (error) console.error("Failed to write audit log:", error.message);
}

Deno.serve(async (req) => {
  // Authenticate the webhook with a shared secret (set in Vault + as a function secret).
  if (req.headers.get("x-cleanup-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (payload.table !== "messages") {
    return new Response("ignored: not messages", { status: 200 });
  }

  const oldUrl = (payload.old_record?.media_url as string | null) ?? null;
  const newUrl =
    payload.type === "DELETE"
      ? null
      : ((payload.record?.media_url as string | null) ?? null);
  const sourceId = payload.old_record?.id ?? payload.record?.id ?? null;

  // Nothing orphaned: no previous file, or the file is still in use on this row.
  if (!oldUrl || oldUrl === newUrl) {
    return new Response("no-op", { status: 200 });
  }

  const path = pathFromPublicUrl(oldUrl);
  if (!path || !path.startsWith(MANAGED_PREFIX)) {
    return new Response("ignored: not managed media", { status: 200 });
  }

  // Never delete a file still referenced by an active record.
  const { count, error: refErr } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("media_url", oldUrl);

  if (refErr) {
    await audit({ path, source_id: sourceId, action: payload.type, status: "error", error: `reference check failed: ${refErr.message}` });
    return new Response("error: reference check failed", { status: 500 });
  }

  if ((count ?? 0) > 0) {
    await audit({ path, source_id: sourceId, action: payload.type, status: "skipped_referenced" });
    return new Response("skipped: still referenced", { status: 200 });
  }

  const { error: delErr } = await admin.storage.from(BUCKET).remove([path]);

  await audit({
    path,
    source_id: sourceId,
    action: payload.type,
    status: delErr ? "error" : "deleted",
    error: delErr?.message ?? null,
  });

  if (delErr) {
    return new Response(`error: ${delErr.message}`, { status: 500 });
  }
  return new Response("deleted", { status: 200 });
});
