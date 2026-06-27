# cleanup-chat-media (Edge Function)

Automatically deletes orphaned chat-media files from the `uploads` Storage bucket
when a `messages` row is deleted, soft-deleted (`media_url` → `null`), or has its
media replaced. It never deletes a file still referenced by an active message, and
records every action in `public.storage_cleanup_log`.

## How it fits together

```
messages UPDATE/DELETE
   └─ trigger trg_chat_media_cleanup (supabase_chat_media_cleanup.sql)
        └─ pg_net POST  ──►  this Edge Function
                                ├─ verify x-cleanup-secret
                                ├─ derive bucket path from old media_url
                                ├─ skip if another message still references it
                                ├─ storage.remove([path])  (service role)
                                └─ insert audit row in storage_cleanup_log
```

## One-time deployment

1. **Apply the SQL** (after `supabase_schema.sql` and `supabase_security.sql`):
   run `supabase_chat_media_cleanup.sql` in the Supabase SQL editor.

2. **Deploy the function:**
   ```bash
   supabase functions deploy cleanup-chat-media
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

3. **Set the shared webhook secret** (pick any strong random string):
   ```bash
   supabase secrets set CLEANUP_WEBHOOK_SECRET=<random-string>
   ```

4. **Register the function URL + the same secret in Vault** (so the trigger can
   call the function). In the SQL editor:
   ```sql
   select vault.create_secret(
     'https://<your-project-ref>.supabase.co/functions/v1/cleanup-chat-media',
     'cleanup_fn_url'
   );
   select vault.create_secret('<random-string>', 'cleanup_webhook_secret');
   ```

## Notes

- The trigger is **fire-and-forget** (`pg_net`), so deleting a message never blocks
  on the cleanup. If Vault secrets aren't set yet, the trigger no-ops with a warning.
- Scope is intentionally limited to files under the `chat_media/` prefix.
- View the audit trail (admins only): `select * from public.storage_cleanup_log order by created_at desc;`
