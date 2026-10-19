# TCB Client Portal

Client portal for TCB Development. Clients sign in and see their own job: schedule, daily logs and photos, budget and pay applications, change orders they can approve or decline, finish selections, documents, and a message thread. Tim signs in as the builder and keeps it all current from the "Builder tools" section — no code or database editing needed. An "Ask Claude" page answers client questions from the job record; Claude also drafts weekly updates and change-order descriptions for Tim to approve.

Stack: Next.js (hosted on Vercel) · Supabase (Postgres, logins, file storage) · Anthropic API.

## One-time setup

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, Run. (Safe to re-run.)
3. **Authentication → URL Configuration**: set *Site URL* to the portal's domain (e.g. `https://portal.example.com`) and add `https://portal.example.com/auth/callback` to *Redirect URLs*.
4. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key for step 3.

The schema pre-registers `tim@tcbreal.com` as a builder. To add another builder, run in the SQL editor:
`insert into builder_emails (email) values ('name@tcbreal.com');` — before that person signs up.

### 2. Anthropic
Create an API key at console.anthropic.com → API keys.

### 3. Vercel
1. vercel.com → Add New Project → import `tcbreal13/tcb-portal`. Framework is detected automatically.
2. **Settings → Environment Variables**, add each of these (see `.env.example`):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (secret) |
| `ANTHROPIC_API_KEY` | Anthropic API key (secret) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` |

3. Deploy. Every later push to `main` redeploys automatically.
4. **Settings → Domains**: add your domain. Vercel shows the DNS records to add at your registrar (Cloudflare): usually an `A` record for the root and a `CNAME` for `www`. In Cloudflare, set those records to **DNS only** (grey cloud), not proxied.

### 4. First sign-in (Tim)
Tim's account is created by inviting himself: go to the Supabase dashboard → **Authentication → Users → Invite user** with `tim@tcbreal.com`. The email link lands on the portal's set-password page. Because the address is in `builder_emails`, the account is a builder with access to every job.

## Day to day
- **New job:** All projects → New project.
- **Give a client access:** job → Builder tools → Clients & access → Invite. They get an email, set a password, and see only that job.
- **Daily log with photos, budget, pay apps, change orders, selections, documents, weekly update:** all under Builder tools on each job.

## Local development
```
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

## Notes
- All data access goes through Supabase row-level security: clients can only read their own job, approve/decline their own change orders, choose selections and post messages. Everything else is builder-only.
- Photos and documents live in private storage buckets; the portal issues one-hour signed links.
- `ANTHROPIC_MODEL` (optional) overrides the model used for Ask Claude and drafting.
- To use a real logo instead of the typed wordmark, add it as `public/logo.svg` and set `NEXT_PUBLIC_LOGO=/logo.svg` in Vercel.
