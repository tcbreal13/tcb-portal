-- 424 Almar Ave: switch the rebuild budget from v001 ($1,908,527, 28 lines, March 4 2026) to the
-- $700/SF conceptual budget (TCB 8/27/26, NB Concept Design Meeting 1), averaged over three cases:
--   Concept A as proposed   3,100 SF   $2,170,000
--   Concept B as proposed   3,120 SF   $2,184,000
--   EO1 max buildout        3,441 SF   $2,408,700
--   Average                 3,220 SF   $2,254,233.33
-- To restore v001, re-run the 424 Almar block of seed-all-jobs.sql.

update projects set
  contract_amount = 2254233.33,
  current_phase = 'Preconstruction — concept budget',
  description = 'Full rebuild of the main house with basement garage per NB Concept Design (Concept A / Concept B), budgeted at $700/SF of enclosed area; full demolition, down-to-the-studs removal per the Mayfield toxicology report (Dec 1, 2025). Budget is the average of Concept A, Concept B and the EO1 max buildout. Construction cost only — no consultant fees, permits, school or utility fees, landscape, pool or hazmat abatement. No signed agreement on file.',
  budget_note = 'The clients will rebuild the main house and TCB will perform a full demolition. Removal down to the studs is carried only to the extent called for in the toxicology report (Mayfield Environmental, December 1, 2025).

The rebuild budget is TCB''s conceptual budget at $700 per SF of enclosed area, averaged across the three cases from the NB Concept Design set: Concept A as proposed (3,100 SF — $2,170,000), Concept B as proposed (3,120 SF — $2,184,000) and the EO1 maximum buildout of 3,441 SF ($2,408,700). The basement garage is carried at the same rate for comparison only. Items the carrier''s estimate did not carry are included here rather than in the insurance comparison.'
where name = '424 Almar Ave';

delete from budget_lines where project_id = (select id from projects where name = '424 Almar Ave');
insert into budget_lines (project_id, category, budget, billed, sort_order) values
  ((select id from projects where name = '424 Almar Ave'), 'Full rebuild — average of Concept A ($2,170,000), Concept B ($2,184,000) and EO1 max buildout ($2,408,700) @ $700/SF', 2254233.33, 0, 1);

select name, contract_amount, (select count(*) from budget_lines b where b.project_id = p.id) as lines, (select sum(budget) from budget_lines b where b.project_id = p.id) as budget_total from projects p where name = '424 Almar Ave';
