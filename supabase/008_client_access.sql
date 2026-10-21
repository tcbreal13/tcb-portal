-- 008: per-client section access. Each member row lists the sections that client may see.
-- Messages are always available to members. Builders see everything.
alter table project_members add column if not exists access text[] not null
  default array['overview','schedule','logs','budget','changes','selections','documents'];

create or replace function can_see(p uuid, s text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_builder() or exists (
    select 1 from project_members where project_id = p and user_id = auth.uid() and s = any(access)
  );
$$;

-- table -> section
do $$
declare r record;
begin
  for r in select * from (values
    ('phases','schedule'), ('schedule_tasks','schedule'), ('lookahead_items','schedule'),
    ('daily_logs','logs'), ('log_photos','logs'),
    ('budget_lines','budget'), ('pay_apps','budget'),
    ('selection_options','selections'),
    ('documents','documents'),
    ('updates','overview')
  ) as t(tbl, sec)
  loop
    execute format('drop policy if exists "%s: member read" on %I', r.tbl, r.tbl);
    execute format('create policy "%s: member read" on %I for select using (can_see(project_id, %L))', r.tbl, r.tbl, r.sec);
  end loop;
end $$;

drop policy if exists "change_orders: member read" on change_orders;
create policy "change_orders: member read" on change_orders for select using (can_see(project_id, 'changes'));
drop policy if exists "change_orders: client decide" on change_orders;
create policy "change_orders: client decide" on change_orders for update
  using (can_see(project_id, 'changes') and status = 'pending')
  with check (can_see(project_id, 'changes') and status in ('approved', 'declined'));

drop policy if exists "selections: member read" on selections;
create policy "selections: member read" on selections for select using (can_see(project_id, 'selections'));
drop policy if exists "selections: client choose" on selections;
create policy "selections: client choose" on selections for update
  using (can_see(project_id, 'selections'))
  with check (can_see(project_id, 'selections') and chosen_option_id is not null);

drop policy if exists "documents: client upload" on documents;
create policy "documents: client upload" on documents for insert
  with check (can_see(project_id, 'documents') and category = 'Client uploads' and uploaded_by = auth.uid());

-- files: photos -> logs; pay-app PDFs -> budget; everything else in documents -> documents
drop policy if exists "storage: members read" on storage.objects;
create policy "storage: members read" on storage.objects for select using (
  (bucket_id = 'photos' and can_see((storage.foldername(name))[1]::uuid, 'logs'))
  or (bucket_id = 'documents' and (storage.foldername(name))[2] = 'payapps' and can_see((storage.foldername(name))[1]::uuid, 'budget'))
  or (bucket_id = 'documents' and coalesce((storage.foldername(name))[2], '') <> 'payapps' and can_see((storage.foldername(name))[1]::uuid, 'documents'))
);
drop policy if exists "storage: client upload" on storage.objects;
create policy "storage: client upload" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[2] = 'client-uploads' and can_see((storage.foldername(name))[1]::uuid, 'documents'));

-- tiers: client (owner) or architect/designer. Only clients may sign selections.
alter table project_members add column if not exists member_role text not null default 'client';
do $$ begin
  alter table project_members add constraint project_members_role_check check (member_role in ('client','architect','consultant'));
exception when duplicate_object then null; end $$;

-- Only builders and clients (owners) may sign. Architects / designers / consultants only view.
create or replace function is_signer(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_builder() or exists (select 1 from project_members where project_id = p and user_id = auth.uid() and member_role = 'client');
$$;
drop policy if exists "selections: client choose" on selections;
create policy "selections: client choose" on selections for update
  using (is_signer(project_id) and can_see(project_id, 'selections'))
  with check (is_signer(project_id) and can_see(project_id, 'selections') and chosen_option_id is not null);
drop policy if exists "change_orders: client decide" on change_orders;
create policy "change_orders: client decide" on change_orders for update
  using (is_signer(project_id) and can_see(project_id, 'changes') and status = 'pending')
  with check (is_signer(project_id) and can_see(project_id, 'changes') and status in ('approved', 'declined'));
