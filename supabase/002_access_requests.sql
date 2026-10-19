-- Access requests from the sign-in page. Run once in Supabase → SQL Editor.
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
create policy "access_requests: anyone can submit" on access_requests for insert
  to anon, authenticated with check (true);

drop policy if exists "access_requests: builder manage" on access_requests;
create policy "access_requests: builder manage" on access_requests for all
  using (is_builder()) with check (is_builder());
