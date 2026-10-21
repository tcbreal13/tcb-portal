-- 010: keep Claude's reading of each inbound email so unsorted ones can be filed by hand later
alter table inbound_emails add column if not exists extracted jsonb not null default '{}'::jsonb;
