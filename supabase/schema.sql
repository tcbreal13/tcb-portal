-- TCB Client Portal — database schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------
create table if not exists builder_emails (
  email text primary key
);
-- Anyone who signs up with one of these addresses becomes a builder (full access).
insert into builder_emails (email) values ('tim@tcbreal.com') on conflict do nothing;

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'client' check (role in ('client', 'builder')),
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from builder_emails where lower(email) = lower(new.email)) then 'builder' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_builder()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'builder');
$$;

-- ---------------------------------------------------------------
-- Projects and membership
-- ---------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  client_names text not null default '',
  description text not null default '',
  current_phase text not null default '',
  schedule_status text not null default 'On track',
  schedule_note text not null default '',
  contract_amount numeric(14,2) not null default 0,
  target_completion date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create or replace function is_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_builder() or exists (select 1 from project_members where project_id = p and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------
-- Job record tables
-- ---------------------------------------------------------------
create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  sort_order int not null default 0
);

create table if not exists lookahead_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  item_date date not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  log_date date not null,
  weather text not null default '',
  crew text not null default '',
  note text not null default '',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists log_photos (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  category text not null,
  budget numeric(14,2) not null default 0,
  billed numeric(14,2) not null default 0,
  sort_order int not null default 0
);

create table if not exists pay_apps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number int not null,
  period_ending date not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'due' check (status in ('due', 'paid')),
  status_date date,
  waiver_note text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, number)
);

create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  code text not null,
  title text not null,
  amount numeric(14,2) not null default 0,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  sent_date date not null default current_date,
  decided_date date,
  decided_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (project_id, code)
);

create table if not exists selections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  item text not null,
  needed_by date,
  chosen_option_id uuid,
  chosen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists selection_options (
  id uuid primary key default gen_random_uuid(),
  selection_id uuid not null references selections (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  price_delta numeric(14,2) not null default 0,
  sort_order int not null default 0
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  doc_date date not null default current_date,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  update_date date not null default current_date,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_project_date on daily_logs (project_id, log_date desc);
create index if not exists messages_project_created on messages (project_id, created_at);
create index if not exists updates_project_date on updates (project_id, update_date desc);

-- ---------------------------------------------------------------
-- Row-level security
-- Builders: everything. Clients: read their own projects; approve/decline
-- change orders, choose selections, and post messages on their own projects.
-- ---------------------------------------------------------------
alter table profiles enable row level security;
alter table builder_emails enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table phases enable row level security;
alter table lookahead_items enable row level security;
alter table daily_logs enable row level security;
alter table log_photos enable row level security;
alter table budget_lines enable row level security;
alter table pay_apps enable row level security;
alter table change_orders enable row level security;
alter table selections enable row level security;
alter table selection_options enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table updates enable row level security;

drop policy if exists "profiles: own or builder read" on profiles;
create policy "profiles: own or builder read" on profiles for select
  using (id = auth.uid() or is_builder()
         or exists (select 1 from project_members m1 join project_members m2 on m1.project_id = m2.project_id
                    where m1.user_id = auth.uid() and m2.user_id = profiles.id));
drop policy if exists "profiles: builder write" on profiles;
create policy "profiles: builder write" on profiles for update using (is_builder()) with check (is_builder());

drop policy if exists "builder_emails: builder" on builder_emails;
create policy "builder_emails: builder" on builder_emails for all using (is_builder()) with check (is_builder());

drop policy if exists "projects: member read" on projects;
create policy "projects: member read" on projects for select using (is_member(id));
drop policy if exists "projects: builder write" on projects;
create policy "projects: builder write" on projects for all using (is_builder()) with check (is_builder());

drop policy if exists "members: read own" on project_members;
create policy "members: read own" on project_members for select using (user_id = auth.uid() or is_builder());
drop policy if exists "members: builder write" on project_members;
create policy "members: builder write" on project_members for all using (is_builder()) with check (is_builder());

-- Generic read-for-members / write-for-builders on the record tables
do $$
declare t text;
begin
  foreach t in array array['phases','lookahead_items','daily_logs','log_photos','budget_lines','pay_apps','selection_options','documents','updates']
  loop
    execute format('drop policy if exists "%s: member read" on %I', t, t);
    execute format('create policy "%s: member read" on %I for select using (is_member(project_id))', t, t);
    execute format('drop policy if exists "%s: builder write" on %I', t, t);
    execute format('create policy "%s: builder write" on %I for all using (is_builder()) with check (is_builder())', t, t);
  end loop;
end $$;

-- Change orders: members read; builders write; clients may only move pending → approved/declined
drop policy if exists "change_orders: member read" on change_orders;
create policy "change_orders: member read" on change_orders for select using (is_member(project_id));
drop policy if exists "change_orders: builder write" on change_orders;
create policy "change_orders: builder write" on change_orders for all using (is_builder()) with check (is_builder());
drop policy if exists "change_orders: client decide" on change_orders;
create policy "change_orders: client decide" on change_orders for update
  using (is_member(project_id) and status = 'pending')
  with check (is_member(project_id) and status in ('approved', 'declined'));

-- Selections: members read; builders write; clients may set their choice
drop policy if exists "selections: member read" on selections;
create policy "selections: member read" on selections for select using (is_member(project_id));
drop policy if exists "selections: builder write" on selections;
create policy "selections: builder write" on selections for all using (is_builder()) with check (is_builder());
drop policy if exists "selections: client choose" on selections;
create policy "selections: client choose" on selections for update
  using (is_member(project_id))
  with check (is_member(project_id) and chosen_option_id is not null);

-- Messages: members read and post on their own projects
drop policy if exists "messages: member read" on messages;
create policy "messages: member read" on messages for select using (is_member(project_id));
drop policy if exists "messages: member post" on messages;
create policy "messages: member post" on messages for insert with check (is_member(project_id) and sender_id = auth.uid());
drop policy if exists "messages: builder manage" on messages;
create policy "messages: builder manage" on messages for delete using (is_builder());

-- ---------------------------------------------------------------
-- Storage: two private buckets. Paths are "<project_id>/<file>".
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 26214400), ('documents', 'documents', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "storage: members read" on storage.objects;
create policy "storage: members read" on storage.objects for select
  using (bucket_id in ('photos', 'documents') and is_member((storage.foldername(name))[1]::uuid));
drop policy if exists "storage: builder write" on storage.objects;
create policy "storage: builder write" on storage.objects for all
  using (bucket_id in ('photos', 'documents') and is_builder())
  with check (bucket_id in ('photos', 'documents') and is_builder());

-- ---------------------------------------------------------------
-- Access requests from the sign-in page (also in 002_access_requests.sql)
-- ---------------------------------------------------------------
create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  project_hint text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists access_requests_status on access_requests (status, created_at desc);
alter table access_requests enable row level security;
drop policy if exists "access_requests: anyone can submit" on access_requests;
create policy "access_requests: anyone can submit" on access_requests for insert to anon, authenticated with check (true);
drop policy if exists "access_requests: builder manage" on access_requests;
create policy "access_requests: builder manage" on access_requests for all using (is_builder()) with check (is_builder());
-- Attach documents to pay applications: invoice, G702/G703 pay app, conditional and unconditional waivers.
alter table pay_apps add column if not exists invoice_path text;
alter table pay_apps add column if not exists payapp_path text;
alter table pay_apps add column if not exists conditional_waiver_path text;
alter table pay_apps add column if not exists unconditional_waiver_path text;
-- Typed e-signatures on client decisions (selections and change orders).
alter table selections add column if not exists signed_name text;
alter table selections add column if not exists signed_by uuid references profiles (id);
alter table change_orders add column if not exists signed_name text;
-- Clients may upload into the "Client uploads" folder of their own job (and remove their own uploads).
alter table documents add column if not exists uploaded_by uuid references profiles (id);

drop policy if exists "documents: client upload" on documents;
create policy "documents: client upload" on documents for insert
  with check (is_member(project_id) and category = 'Client uploads' and uploaded_by = auth.uid());
drop policy if exists "documents: client remove own" on documents;
create policy "documents: client remove own" on documents for delete
  using (is_builder() or (uploaded_by = auth.uid() and category = 'Client uploads'));

drop policy if exists "storage: client upload" on storage.objects;
create policy "storage: client upload" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[2] = 'client-uploads' and is_member((storage.foldername(name))[1]::uuid));
drop policy if exists "storage: client remove own upload" on storage.objects;
create policy "storage: client remove own upload" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[2] = 'client-uploads' and owner = auth.uid());

-- 006: detailed schedule tasks (Buildertrend-style) under each phase
create table if not exists schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  phase_id uuid references phases (id) on delete set null,
  title text not null,
  start_date date not null,
  end_date date not null,
  duration_days int not null default 1,
  assigned_to text not null default '',
  cost_code text not null default '',
  predecessors text not null default '',
  predecessor_type text not null default '',
  lag_days text not null default '',
  show_client boolean not null default true,
  status text not null default 'planned' check (status in ('planned','in_progress','complete')),
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists schedule_tasks_project_idx on schedule_tasks (project_id, sort_order);
alter table schedule_tasks enable row level security;
drop policy if exists "schedule_tasks: member read" on schedule_tasks;
create policy "schedule_tasks: member read" on schedule_tasks for select using (is_member(project_id));
drop policy if exists "schedule_tasks: builder write" on schedule_tasks;
create policy "schedule_tasks: builder write" on schedule_tasks for all using (is_builder()) with check (is_builder());
