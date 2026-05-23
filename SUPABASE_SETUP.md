# RBMI Admission Hub Supabase Setup

## 1. Put credentials here

Write credentials in `merrito-/.env`:

```env
REAL_DATA_MODE=true
USE_DEMO_DATA=false
SEED_DEMO_USERS=false
VITE_SHOW_DEMO_LOGIN=false

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

WEBHOOK_SECRET=make-a-long-random-secret
JWT_SECRET=make-another-long-random-secret
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend code. Keep it only in `.env` on the server.

## 2. Create database tables

In Supabase SQL Editor, run:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_real_mode_policies.sql`

The server uses `SUPABASE_SERVICE_ROLE_KEY`, so API routes can write securely while RLS protects direct browser access.

## 3. Create real users

Copy:

```bash
scripts/real-users.example.json
```

to:

```bash
scripts/real-users.local.json
```

Put your real admin, counselor, and student emails/passwords there. This file is ignored by git.

Then run:

```bash
npm run seed:users
```

That creates Supabase Auth users and matching `profiles`. Counselors are also inserted into `counselors` when `counselor_id` is provided.

## 4. Remove local demo data

When using Supabase, the app reads the real database. Existing `server/data.json` is ignored for core CRM data.

For local fallback only, use:

```env
REAL_DATA_MODE=true
USE_DEMO_DATA=false
SEED_DEMO_USERS=false
```

## 5. Lead automation like Meritto

Use this public endpoint:

```http
POST https://your-domain.com/api/webhook/lead
X-Webhook-Secret: your-WEBHOOK_SECRET
Content-Type: application/json
```

Payload:

```json
{
  "name": "Rahul Sharma",
  "phone": "+91 9876543210",
  "email": "rahul@example.com",
  "course": "MBA",
  "source": "Website",
  "city": "Bareilly",
  "priority": "high"
}
```

Connect sources through n8n, Zapier, Make, or direct webhooks:

- Website forms: send directly to `/api/webhook/lead`.
- Facebook Lead Ads: trigger on new lead, map fields, POST to webhook.
- Google Ads Lead Form: use Zapier/n8n to forward leads.
- Shiksha, CollegeDekho, JustDial: configure lead delivery URL or email parser, then POST normalized data.
- Missed calls/IVR: Exotel/Knowlarity webhook can send caller number.

The app will deduplicate by phone/email, auto-create a lead, assign follow-up tasks, and log activities.
