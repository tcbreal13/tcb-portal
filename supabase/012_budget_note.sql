-- 012: a note the client sees at the top of Budget & billing (scope basis, what the budget covers)
alter table projects add column if not exists budget_note text not null default '';
