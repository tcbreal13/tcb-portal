-- 016: Insurance comparison — scope the carrier did not carry, in tiers with running totals.
-- tier1 rebuild scope per the toxicology report · tier2 building code upgrades · tier3 fire preventative measures ·
-- tier4 soft costs (owner-direct, no markup). Overhead and fee on the claim apply to tiers 1–3.
alter table insurance_lines drop constraint if exists insurance_lines_section_check;
alter table insurance_lines add constraint insurance_lines_section_check check (section in ('trade', 'addon', 'gap', 'tier1', 'tier2', 'tier3', 'tier4'));

alter table insurance_claims add column if not exists tier_overhead numeric(6,4) not null default 0;
alter table insurance_claims add column if not exists tier_fee numeric(6,4) not null default 0;
alter table insurance_claims add column if not exists tier_labels jsonb not null default '{}'::jsonb;
alter table insurance_claims add column if not exists tier_intro text not null default '';
