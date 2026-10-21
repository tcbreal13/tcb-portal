-- 009: Pre-development tracker (agencies, fees, activity) and inbound agency emails.
-- Clients see it when their access includes 'predev'. Builders edit everything and accept email suggestions.

-- clients get the new section by default; existing client members keep their current switches plus predev
alter table project_members alter column access
  set default array['overview','schedule','logs','budget','changes','selections','documents','predev'];
update project_members set access = array_append(access, 'predev')
  where member_role = 'client' and not ('predev' = any(access));

create table if not exists predev_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  agency text not null,                          -- coastal | mello | sb9 | lacounty | ladbs | custom-…
  label text not null,
  applies boolean,                               -- null = not decided yet
  status text not null default 'not_started',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  case_number text not null default '',
  submitted_date date,
  est_completion date,
  notes text not null default '',
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, agency)
);

create table if not exists predev_fees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  track_id uuid not null references predev_tracks (id) on delete cascade,
  description text not null default '',
  requested_amount numeric(12,2),
  requested_date date,
  paid_amount numeric(12,2),
  paid_date date,
  created_at timestamptz not null default now()
);

create table if not exists inbound_emails (
  id uuid primary key default gen_random_uuid(),
  resend_id text unique,
  received_at timestamptz not null default now(),
  from_addr text not null default '',
  to_addr text not null default '',
  subject text not null default '',
  body text not null default '',
  project_id uuid references projects (id) on delete set null,
  agency text,
  status text not null default 'new'             -- new | suggested | unsorted | ignored
);

create table if not exists predev_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  track_id uuid references predev_tracks (id) on delete cascade,
  activity_date date not null default current_date,
  summary text not null,
  source text not null default 'manual',         -- manual | email
  state text not null default 'accepted',        -- pending | accepted | rejected
  email_id uuid references inbound_emails (id) on delete set null,
  email_from text not null default '',
  email_subject text not null default '',
  proposed jsonb not null default '{}'::jsonb,   -- field updates Claude suggests, applied on accept
  decided_by uuid references profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists predev_activity_project_idx on predev_activity (project_id, activity_date desc);

alter table predev_tracks enable row level security;
alter table predev_fees enable row level security;
alter table predev_activity enable row level security;
alter table inbound_emails enable row level security;

drop policy if exists "predev_tracks: read" on predev_tracks;
create policy "predev_tracks: read" on predev_tracks for select using (can_see(project_id, 'predev'));
drop policy if exists "predev_tracks: builder write" on predev_tracks;
create policy "predev_tracks: builder write" on predev_tracks for all using (is_builder()) with check (is_builder());

drop policy if exists "predev_fees: read" on predev_fees;
create policy "predev_fees: read" on predev_fees for select using (can_see(project_id, 'predev'));
drop policy if exists "predev_fees: builder write" on predev_fees;
create policy "predev_fees: builder write" on predev_fees for all using (is_builder()) with check (is_builder());

-- clients only ever see accepted activity; pending suggestions are Tim's to review
drop policy if exists "predev_activity: read" on predev_activity;
create policy "predev_activity: read" on predev_activity for select
  using (is_builder() or (state = 'accepted' and can_see(project_id, 'predev')));
drop policy if exists "predev_activity: builder write" on predev_activity;
create policy "predev_activity: builder write" on predev_activity for all using (is_builder()) with check (is_builder());

drop policy if exists "inbound_emails: builder" on inbound_emails;
create policy "inbound_emails: builder" on inbound_emails for all using (is_builder()) with check (is_builder());
