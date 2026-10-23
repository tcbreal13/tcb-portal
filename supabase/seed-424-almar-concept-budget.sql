-- 424 Almar Ave: rebuild budget re-based to the $700/SF conceptual budget, averaged over the three concept cases
--   Concept A as proposed 3,100 SF $2,170,000 | Concept B as proposed 3,120 SF $2,184,000 | EO1 max buildout 3,441 SF $2,408,700
--   Average $2,254,233.33. The v001 breakdown (28 lines, $1,909,127) is kept and each line scaled by 1.180767; rounding lands on the last line.

update projects set
  contract_amount = 2254233.33,
  current_phase = 'Preconstruction — concept budget',
  description = 'Full rebuild of the main house with basement garage per NB Concept Design (Concept A / Concept B) ; full demolition, down-to-the-studs removal per the Mayfield toxicology report (Dec 1, 2025). Budget is the average of Concept A, Concept B and the EO1 max buildout, spread across the v001 cost codes. No signed agreement on file. Garage/ADU budgeted separately ($385,621).',
  budget_note = 'The clients will rebuild the main house and TCB will perform a full demolition. Removal down to the studs is carried only to the extent called for in the toxicology report (Mayfield Environmental, December 1, 2025).

CONCEPT BUDGET (TCB conceptual budget, NB Concept Design Meeting 1):
Concept A as proposed — 3,100 SF — $2,170,000
Concept B as proposed — 3,120 SF — $2,184,000
EO1 maximum buildout — 3,441 SF — $2,408,700
Budget carried below = average of the three — $2,254,233

The breakdown by cost code is the March 2026 preliminary budget spread to that total. Items the carrier''s estimate did not carry are included here rather than in the insurance comparison.'
where name = '424 Almar Ave';

update budget_lines set budget = 106108.41 where project_id = (select id from projects where name = '424 Almar Ave') and category = '1300 — Partial to-the-studs demo per toxicology';
update budget_lines set budget = 21363.61 where project_id = (select id from projects where name = '424 Almar Ave') and category = '6940 — Facilities, temp power, fence';
update budget_lines set budget = 37895.52 where project_id = (select id from projects where name = '424 Almar Ave') and category = '2000 — Excavation planter and retaining walls';
update budget_lines set budget = 15515.27 where project_id = (select id from projects where name = '424 Almar Ave') and category = '2115 — Concrete retaining walls';
update budget_lines set budget = 171555.94 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3110/3140 — Framing and trusses';
update budget_lines set budget = 94018.54 where project_id = (select id from projects where name = '424 Almar Ave') and category = '1470 — Rough underground electrical (shared with ADU)';
update budget_lines set budget = 25949.71 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3720 — Plumbing / mechanical updates';
update budget_lines set budget = 25783.22 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3810 — Rough electrical updates';
update budget_lines set budget = 37974.63 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3610 — HVAC rough';
update budget_lines set budget = 38063.19 where project_id = (select id from projects where name = '424 Almar Ave') and category = '4400 — Insulation';
update budget_lines set budget = 89797.3 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3400 — Exterior wrap, smooth stucco';
update budget_lines set budget = 34257.58 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3730 — Sprinklers';
update budget_lines set budget = 109929.37 where project_id = (select id from projects where name = '424 Almar Ave') and category = '4100 — Roofing material and labor';
update budget_lines set budget = 159853.36 where project_id = (select id from projects where name = '424 Almar Ave') and category = '3300/3350 — Windows, doors, garage door';
update budget_lines set budget = 106545.29 where project_id = (select id from projects where name = '424 Almar Ave') and category = '2200 — Waterproofing';
update budget_lines set budget = 135713.77 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5100 — Drywall';
update budget_lines set budget = 129028.27 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5520 — Special flooring, hardwood';
update budget_lines set budget = 157361.94 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5510 — Tile, stone and masonry';
update budget_lines set budget = 162562.04 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5400 — Cabinets, vanities and millwork';
update budget_lines set budget = 52135.57 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5300 — Interior painting / staining';
update budget_lines set budget = 64404.91 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5710 — Plumbing final / fixtures';
update budget_lines set budget = 70200.11 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5720/5730 — Electrical finishes and final';
update budget_lines set budget = 63070.65 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5700 — HVAC finishes and final';
update budget_lines set budget = 45716.92 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5620 — Shower doors, mirrors and glazing';
update budget_lines set budget = 70200.11 where project_id = (select id from projects where name = '424 Almar Ave') and category = '5630 — Appliances';
update budget_lines set budget = 43652.94 where project_id = (select id from projects where name = '424 Almar Ave') and category = '6300/6400 — Driveway, patio, walk pads';
update budget_lines set budget = 116591.25 where project_id = (select id from projects where name = '424 Almar Ave') and category = '6600 — Landscaping allocated budget (TBD)';
update budget_lines set budget = 68983.91 where project_id = (select id from projects where name = '424 Almar Ave') and category = '6650 — Site retaining walls / garden walls (TBD)';

select name, contract_amount, (select count(*) from budget_lines b where b.project_id = p.id) as lines, (select sum(budget) from budget_lines b where b.project_id = p.id) as budget_total from projects p where name = '424 Almar Ave';
