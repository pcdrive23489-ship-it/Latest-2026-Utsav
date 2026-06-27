# UtsavConnect

UtsavConnect is a Next.js + Supabase community app for Ganesh Utsav coordination. It includes member approvals, announcements, donations, collection tracking, finance visibility, chat, live darshan, devotional songs, and rangoli voting.

## Tech Stack

- Next.js 15 with React 18 and TypeScript
- Supabase Auth, Database, Realtime, and Storage
- Tailwind CSS and Radix UI components
- Agora RTC for Live Darshan
- Capacitor configured for Android packaging

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_AGORA_APP_ID=...
   ```

3. Apply `supabase_schema.sql` in the Supabase SQL editor, then apply
   `supabase_security.sql` (RLS policies, role triggers, and secure RPCs).
   The security script is required — without it the database is not locked down.
   It is non-destructive and safe to re-run.

   Existing databases created before the suspension flow need this migration:

   ```sql
   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
   ALTER TABLE public.users
     ADD CONSTRAINT users_status_check
     CHECK (status IN ('pending', 'approved', 'rejected'));
   ```

4. Start development:

   ```bash
   npm run dev
   ```

## Quality Commands

```bash
npm run typecheck
npm run test
npm run build
```

Note: `npm`/`node` must be available on PATH. In the current audit shell they were not available, so TypeScript was verified through the local compiler API instead.

## Android / Capacitor

`capacitor.config.ts` is present and points to `webDir: "out"`, but the native `android/` project has not been generated yet. After the web build is stable, run:

```bash
npx cap add android
npx cap sync android
npx cap open android
```

If you intend to ship a static Capacitor bundle, configure Next.js static export before syncing Android.

## Current Notes

- Admin account deletion is implemented as suspension (`rejected`) because client-only code cannot safely delete Supabase Auth users. Suspended users remain auditable and can be restored by approving them again.
- Authorization is enforced in Postgres (RLS + `SECURITY DEFINER` triggers/RPCs from `supabase_security.sql`). The client-side role checks in `src/app/(app)/client-layout.tsx` are UX only — the database is the real gate. New profiles are created server-side by the `handle_new_user` trigger; the first account ever becomes the super-admin.
- The implementation is Supabase-only. The previous Firebase and Genkit code has been removed.
- Live Darshan requires a valid Agora App ID and browser camera/microphone permissions.
