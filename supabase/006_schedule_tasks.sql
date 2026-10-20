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
