# LYNK — Deployment Checklist

## Prerequisites
- Supabase account
- Vercel account
- GitHub repository connected to Vercel

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Open the SQL Editor and run the full migration file: `001_initial_schema.sql`

## Step 2: Create Storage Buckets

In Supabase Dashboard → Storage, create these three buckets:

| Bucket    | Public | Description                      |
|-----------|--------|----------------------------------|
| `avatars` | Yes    | User profile photos              |
| `proofs`  | Yes    | Bet proof uploads (photos/video) |
| `shame`   | Yes    | Punishment proof uploads         |

Set appropriate RLS policies on each bucket (allow authenticated uploads, public reads).

## Step 2b: Run database migrations (required for verdict / “Declare your verdict”)

The **Declare your verdict** flow (submit proof and choose YES/NO) requires the `proofs` table to have `ruling` and `ruling_deadline` columns. If you see:

**“Could not find the 'ruling' column of 'proofs' in the schema cache”**

run the migration that adds these columns:

**Option A — Supabase CLI (recommended)**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Option B — SQL Editor (quick fix)**

In Supabase Dashboard → **SQL Editor**, run the contents of:

`supabase/migrations/20260224100000_add_proof_ruling_columns_idempotent.sql`

Or paste and run:

```sql
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS ruling TEXT;
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS ruling_deadline TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proofs_ruling_check') THEN
    ALTER TABLE proofs ADD CONSTRAINT proofs_ruling_check
    CHECK (ruling IS NULL OR ruling IN ('riders_win', 'doubters_win'));
  END IF;
END $$;
```

Then reload the schema cache: **Settings → API → “Reload schema cache”** (if available).

## Step 3: Enable Phone Auth

1. Go to Authentication → Providers → Phone
2. Enable the Phone provider
3. Configure your SMS provider (see Step 4)

## Step 4: Set Up SMS Provider (Twilio)

1. Create a [Twilio](https://www.twilio.com) account
2. Get a phone number with SMS capability
3. In Supabase Dashboard → Authentication → Phone:
   - Set SMS Provider to **Twilio**
   - Enter your Twilio Account SID, Auth Token, and phone number

## Step 5: Deploy Edge Functions

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the auto-resolve function (runs hourly via cron)
supabase functions deploy auto-resolve

# Deploy the notification sender
supabase functions deploy send-notification
```

Set up a cron trigger for `auto-resolve` to run every hour:
- Supabase Dashboard → Edge Functions → auto-resolve → Add Schedule → `0 * * * *`

## Step 6: Set Environment Variables in Vercel

In your Vercel project settings → Environment Variables, add:

| Variable                  | Value                                      |
|---------------------------|--------------------------------------------|
| `VITE_SUPABASE_URL`      | `https://YOUR_PROJECT.supabase.co`         |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key                     |

Make sure these are set for **Production**, **Preview**, and **Development** environments.

## Step 7: Connect GitHub Repo to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Install Command: `npm install`

## Step 8: Deploy

Push to `main` branch and Vercel will automatically build and deploy.

```bash
git push origin main
```

---

## Post-Deploy Verification

- [ ] App loads at your Vercel URL
- [ ] Dark mode renders correctly
- [ ] Phone auth flow sends OTP
- [ ] Refreshing any route works (SPA rewrites active)
- [ ] Storage uploads work (avatars, proofs, shame)
- [ ] Realtime subscriptions connect
