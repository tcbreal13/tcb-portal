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
