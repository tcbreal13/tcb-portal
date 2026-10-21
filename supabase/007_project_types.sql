-- 007: project type tags (multi-select)
alter table projects add column if not exists project_types text[] not null default '{}';
