-- 354 Arno Way: contract, schedule of values (G703 App 1), CO-01
-- 504 N Marquette: revised construction budget 5/19/26 ($2.388M)
-- Safe to re-run: budget lines are replaced in full for these two jobs.

update projects set
  client_names = 'Mark Dawson & Karen Attyah',
  address = '354 N Arno Way, Pacific Palisades, CA 90272',
  description = 'Fire rebuild – total loss. Construction agreement dated July 18, 2026 (project no. 202513)',
  contract_amount = 1984156.38
where name = '354 Arno Way';

delete from budget_lines where project_id = (select id from projects where name = '354 Arno Way');
insert into budget_lines (project_id, category, budget, billed, sort_order)
select p.id, v.category, v.budget, 0, v.n
from projects p, (values
  (1,  '6940 — Facilities – temp power – fence', 20904.00),
  (2,  '2120 — Rough grading', 21888.00),
  (3,  '2000 — Excavation – compaction and backfill', 46138.00),
  (4,  '2000 — Excavation – planter and retaining walls', 27639.00),
  (5,  '3100 — Structural steel – footings – grade beams', 121278.00),
  (6,  '2115 — Concrete for foundation – footings, stem walls and slabs', 68150.00),
  (7,  '2115 — Concrete retaining walls', 11316.00),
  (8,  '4200 — CMU block wall – structural masonry', 388000.00),
  (9,  '1470 — Rough underground electrical', 28500.00),
  (10, '3720 — Rough plumbing – mechanical', 45914.09),
  (11, '3810 — Rough electrical', 77487.26),
  (12, '3610 — HVAC – rough', 28827.03),
  (13, '4400 — Insulation', 27761.00),
  (14, '3400 — Exterior wrap – smooth stucco', 65492.00),
  (15, '3730 — Sprinklers', 24985.00),
  (16, '4100 — Roofing material', 80175.00),
  (17, '3300-3350 — Windows – doors – garage door', 116587.00),
  (18, '2200 — Waterproofing', 77707.00),
  (19, '5100 — Drywall', 98981.00),
  (20, '5520 — Special flooring hardwood', 50000.00),
  (21, '5510 — Tile – stone and masonry', 94769.00),
  (22, '5400 — Cabinets – vanities and millwork', 88562.00),
  (23, '5300 — Interior painting – staining – trims and millwork', 38024.00),
  (24, '5710 — Plumbing – final – fixtures', 46973.00),
  (25, '5720-5730 — Electrical finishes – electrical final', 51199.00),
  (26, '5700 — HVAC – finishes and final', 46000.00),
  (27, '5620 — Shower doors, mirrors and glazing', 33343.00),
  (28, '5630 — Appliances', 51199.00),
  (29, '6300-6400 — Driveway – patio – walk pads', 36970.00),
  (30, '6600 — Landscaping (allocated budget – TBD)', 50000.00),
  (31, '6700 — LID drainage – low impact development / stormwater (TBD)', 19388.00)
) as v(n, category, budget)
where p.name = '354 Arno Way';

insert into change_orders (project_id, code, title, amount, description, status, sent_date)
select p.id, 'CO-01', 'Partial demolition and removal of existing patio slab and stone pavers', 17876.00,
  'At your request, partial demolition and removal of the existing patio slab and the stone paver finish installed over it, which was not included in the Construction Agreement dated 7/18/26. The area is approximately 700 SF of 3/4" stone pavers in a mortar bed over a 10" concrete slab (about 21.6 cubic yards and 50 tons of debris). Includes sawcutting a clean edge at the work to remain, protection of adjacent finishes, machine demolition, removal of reinforcing, dust control, rough grading of the exposed subgrade, and hauling to a permitted recycling facility with weight tickets and diversion documentation ($12,188 demolition + $5,688 disposal). Quantities are based on dimensions provided and will be adjusted by change order if actual conditions differ. Does not include new concrete, pavers or hardscape in the removal area, paver salvage, structural work, utility relocation, or hazardous material handling. The 8% management fee under clause 2.2 of the agreement applies and is billed separately. Estimated duration: 7 business days.',
  'pending', '2026-08-30'
from projects p where p.name = '354 Arno Way'
and not exists (select 1 from change_orders c where c.project_id = p.id and c.code = 'CO-01');

-- ---------------------------------------------------------------
update projects set
  client_names = 'Mr. & Mrs. Donovan',
  address = '504 N Marquette St, Pacific Palisades, CA 90272',
  description = 'Fire rebuild – total loss. Revised construction budget dated May 19, 2026',
  contract_amount = 2388000.00
where name = '504 N Marquette St';

delete from budget_lines where project_id = (select id from projects where name = '504 N Marquette St');
insert into budget_lines (project_id, category, budget, billed, sort_order)
select p.id, v.category, v.budget, 0, v.n
from projects p, (values
  (1,  '6940 — Facilities – temp power – fence', 18171.95),
  (2,  '2120 — Rough grading', 19027.35),
  (3,  '2000 — Excavation – compaction', 84912.87),
  (4,  '3100 — Structural steel – footings – grade beams', 172798.76),
  (5,  '2115 — Concrete for foundation', 31105.49),
  (6,  '3110-3140 — Framing – trusses', 257692.50),
  (7,  '3700 — Underground plumbing – mechanical', 21357.96),
  (8,  '1470 — Rough underground electrical', 74205.63),
  (9,  '3720 — Rough plumbing – mechanical', 45914.10),
  (10, '3810 — Rough electrical', 77487.26),
  (11, '3610 — HVAC – rough', 28827.03),
  (12, '4400 — Insulation', 28022.93),
  (13, '3400 — Exterior wrap – smooth stucco', 100187.42),
  (14, '3730 — Sprinklers', 25221.15),
  (15, '4100 — Roofing material', 81453.90),
  (16, '3300-3350 — Windows – doors – garage door', 117687.42),
  (17, '2200 — Waterproofing', 59663.89),
  (18, '5100 — Drywall', 99915.34),
  (19, '5520 — Special flooring hardwood', 150628.87),
  (20, '5510 — Tile – stone and masonry', 170445.54),
  (21, '5400 — Cabinets – vanities and millwork', 163146.86),
  (22, '5300 — Interior painting – staining – trims and millwork', 72230.58),
  (23, '5710 — Plumbing – final – fixtures', 47416.25),
  (24, '5720-5730 — Electrical finishes – electrical final', 74980.18),
  (25, '5700 — HVAC – finishes and final', 46086.22),
  (26, '5620 — Shower doors, mirrors and glazing', 33640.38),
  (27, '5630 — Appliances', 51682.80),
  (28, '6300-6400 — Driveway – patio – walk pads', 32138.21),
  (29, '6600 — Landscaping (allocated budget – TBD)', 85836.93),
  (30, '6650 — Site retaining walls (allocated budget – TBD)', 50787.42),
  (31, 'Insurance and overhead', 65326.82)
) as v(n, category, budget)
where p.name = '504 N Marquette St';

select p.name, count(b.id) as lines, sum(b.budget) as total, p.contract_amount
from projects p left join budget_lines b on b.project_id = p.id
where p.name in ('354 Arno Way', '504 N Marquette St') group by p.name, p.contract_amount;
