-- Custom document folders and subfolders, per project.
-- A folder is a path: "Construction Plans", or "Construction Plans / Architectural" for a subfolder.
-- documents.category holds the path the file lives in. The six standard folders stay implicit on every job.
-- Tim can add folders anywhere. Clients can add subfolders inside "Client uploads" and upload into them.
create table if not exists doc_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  path text not null check (length(path) between 1 and 200),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, path)
);
alter table doc_folders enable row level security;

drop policy if exists "doc_folders: read" on doc_folders;
create policy "doc_folders: read" on doc_folders for select using (is_builder() or can_see(project_id, 'documents'));
drop policy if exists "doc_folders: builder manage" on doc_folders;
create policy "doc_folders: builder manage" on doc_folders for all using (is_builder()) with check (is_builder());
drop policy if exists "doc_folders: client add in uploads" on doc_folders;
create policy "doc_folders: client add in uploads" on doc_folders for insert
  with check (can_see(project_id, 'documents') and path like 'Client uploads / %' and created_by = auth.uid());
drop policy if exists "doc_folders: client remove own" on doc_folders;
create policy "doc_folders: client remove own" on doc_folders for delete
  using (created_by = auth.uid() and path like 'Client uploads / %');

-- Clients may file uploads into "Client uploads" or any subfolder of it.
drop policy if exists "documents: client upload" on documents;
create policy "documents: client upload" on documents for insert
  with check (can_see(project_id, 'documents') and (category = 'Client uploads' or category like 'Client uploads / %') and uploaded_by = auth.uid());
drop policy if exists "documents: client remove own" on documents;
create policy "documents: client remove own" on documents for delete
  using (is_builder() or (uploaded_by = auth.uid() and (category = 'Client uploads' or category like 'Client uploads / %')));

-- 424 Almar Ave: plan, soils and survey folders.
insert into doc_folders (project_id, path)
select p.id, f from projects p, unnest(array['Construction Plans', 'Soil Report', 'Survey']) f
where p.name ilike '%424%almar%'
on conflict (project_id, path) do nothing;

select p.name, f.path from doc_folders f join projects p on p.id = f.project_id order by 1, 2;
