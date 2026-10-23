-- 011: Insurance budget comparison — the carrier's estimate re-cut by trade with TCB's market budget beside it.
-- Clients see it only when their access includes 'insurance' (off by default; switch it on per client under
-- Clients & access). Builders edit everything. Also records when an approved change order was paid.

-- one claim record per project (carrier, claim number, limits, settlement waterfall)
create table if not exists insurance_claims (
  project_id uuid primary key references projects (id) on delete cascade,
  carrier text not null default '',
  claim_number text not null default '',
  date_of_loss date,
  estimate_date date,
  estimate_by text not null default '',
  settlement_date date,
  carrier_label text not null default 'Carrier estimate',
  tcb_label text not null default 'TCB market budget',
  intro text not null default '',                -- shown to the client above the tables
  left_out text not null default '',             -- summary under the comparison: one bullet per line of what the carrier left out
  limits jsonb not null default '[]'::jsonb,     -- [{label, amount}]
  settlement jsonb not null default '[]'::jsonb, -- [{label, amount}] the carrier's settlement waterfall
  notes text not null default '',                -- builder-only working notes
  updated_at timestamptz not null default now()
);

-- the side-by-side lines. section: trade | addon (tax, O&P, permits) | gap (scope the carrier did not carry)
create table if not exists insurance_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  section text not null default 'trade' check (section in ('trade', 'addon', 'gap')),
  category text not null,
  carrier_amount numeric(14,2) not null default 0,
  tcb_amount numeric(14,2) not null default 0,
  note text not null default '',
  sort_order int not null default 0
);
create index if not exists insurance_lines_project_idx on insurance_lines (project_id, section, sort_order);

alter table insurance_claims enable row level security;
alter table insurance_lines enable row level security;

drop policy if exists "insurance_claims: member read" on insurance_claims;
create policy "insurance_claims: member read" on insurance_claims for select using (can_see(project_id, 'insurance'));
drop policy if exists "insurance_claims: builder write" on insurance_claims;
create policy "insurance_claims: builder write" on insurance_claims for all using (is_builder()) with check (is_builder());

drop policy if exists "insurance_lines: member read" on insurance_lines;
create policy "insurance_lines: member read" on insurance_lines for select using (can_see(project_id, 'insurance'));
drop policy if exists "insurance_lines: builder write" on insurance_lines;
create policy "insurance_lines: builder write" on insurance_lines for all using (is_builder()) with check (is_builder());

-- paid date on change orders (approved → paid), shown to the client as a "Paid" pill
alter table change_orders add column if not exists paid_date date;
