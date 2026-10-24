-- Miro boards shown inside a job's section (Selections for now). Visible to whoever can see that section.
create table if not exists project_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  section text not null default 'selections',
  title text not null default '',
  board_id text not null check (board_id ~ '^[A-Za-z0-9_=\-]{6,80}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table project_boards enable row level security;
drop policy if exists "project_boards: read" on project_boards;
create policy "project_boards: read" on project_boards for select using (is_builder() or can_see(project_id, section));
drop policy if exists "project_boards: builder manage" on project_boards;
create policy "project_boards: builder manage" on project_boards for all using (is_builder()) with check (is_builder());
select count(*) as project_boards_ok from project_boards;
