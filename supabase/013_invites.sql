-- Invites Tim reviews before anyone gets a login.
-- A request from the sign-in page (or a "review first" invite from a job's People page) becomes a draft here.
-- Tim picks jobs, role and sections, adds a note, then activates: only then is the account created and the
-- activation link emailed. Run once in Supabase → SQL Editor.
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  note text not null default '',                 -- personal line shown in the activation email
  request_id uuid references access_requests (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'cancelled')),
  user_id uuid references profiles (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invites_status on invites (status, created_at desc);

create table if not exists invite_jobs (
  invite_id uuid not null references invites (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  member_role text not null default 'client' check (member_role in ('client', 'architect', 'consultant')),
  access text[] not null default '{}',
  primary key (invite_id, project_id)
);

alter table invites enable row level security;
alter table invite_jobs enable row level security;

drop policy if exists "invites: builder manage" on invites;
create policy "invites: builder manage" on invites for all using (is_builder()) with check (is_builder());
drop policy if exists "invite_jobs: builder manage" on invite_jobs;
create policy "invite_jobs: builder manage" on invite_jobs for all using (is_builder()) with check (is_builder());
