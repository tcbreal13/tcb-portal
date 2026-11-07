-- Seed: 424 Almar Ave — scope USAA did not carry, in four tiers, with running totals on the Insurance budget
-- comparison tab. Run after 016_insurance_tiers.sql. Safe to re-run (replaces the tier lines).
--
-- Source: "424 Almar Ave - Alternative Budget - Full To-The-Studs Scope vs USAA.xlsx" (TCB, 11/6/2026).
-- TCB tier amounts are pre-overhead / pre-fee; the claim's 10% / 10% is applied to tiers 1–3 in the running totals.
-- Tier 4 soft costs are owner-direct at cost. Running totals land on: same scope $1,386,034.48 →
-- tier 1 $1,680,270.18 → tier 2 $1,899,921.48 → tier 3 $1,975,443.63 → tier 4 $2,108,943.63.

update insurance_claims set
  tier_overhead = 0.10,
  tier_fee = 0.10,
  tier_labels = '{"tier1": "Rebuild scope per the Mayfield Environmental report (12/1/25) — not carried by USAA", "tier2": "Building code upgrades triggered by the permit for that scope", "tier3": "Fire preventative measures — Very High Fire Hazard Severity Zone", "tier4": "Soft costs — design, engineering, permits and inspections (owner-direct, no markup)"}'::jsonb,
  tier_intro = 'The USAA estimate follows a cleaning-based remediation. The clients'' toxicologist, Mayfield Environmental, recommends removing the finishes in the affected rooms down to the framing. The tiers below are the work that recommendation adds, each priced as the balance beyond what USAA carried so nothing duplicates the trade comparison above. Tier 1 is the rebuild scope itself; tier 2 is the code work a permit for that scope brings with it; tier 3 is what the fire-hazard zone requires on a rebuilt envelope; tier 4 is the professional fees, permits and inspections. TCB rates are current Pacific Palisades market rates; quantities are to be verified in the field.',
  intro = 'USAA''s replacement-cost estimate for the main house, re-cut by trade exactly as USAA categorized it, with TCB''s current Pacific Palisades post-fire market pricing for the same scope beside each line. This compares like for like: the same work USAA priced, at what it costs to have it done here today. The scope USAA did not carry at all follows in tiers below, with running totals.',
  left_out = 'Demolition to the studs in the affected rooms, abatement of the 1949 finishes and encapsulation of the exposed framing — USAA carried room-by-room selective demolition and testing only
Sealing and painting the balance of the interior walls and ceilings — USAA carried about 8,200 SF of the 14,900 SF of wall and ceiling surface
Removal and replacement of the balance of the attic and ceiling insulation (smoke-saturated) — only about 1,400 SF of batt and 390 SF of blown insulation carried
New electrical, plumbing and HVAC rough-in to current code — USAA carried a panel and openings by count, four plumber hours, and equipment replacement with duct cleaning
Structural work to current code when the 1949 east wing is opened — USAA carried framing repair at the damaged areas only
Fire sprinklers and Chapter 7A exterior compliance required in the Very High Fire Hazard Severity Zone — not carried
General conditions: supervision, temporary power and toilet, dust control, protection and final clean — not carried
Architect, structural, civil and MEP engineering, geotechnical report, Title 24, survey, plan check and special inspections — USAA carried $187.92 in permits',
  updated_at = now()
where project_id = (select id from projects where name = '424 Almar Ave');

delete from insurance_lines where project_id = (select id from projects where name = '424 Almar Ave') and section in ('tier1','tier2','tier3','tier4');

insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order)
select (select id from projects where name = '424 Almar Ave'), v.section, v.category, v.carrier_amount, v.tcb_amount, v.note, v.sort_order
from (values
 -- Tier 1 — Mayfield rebuild scope
 ('tier1', 'Balance of interior demolition to the studs at all affected rooms (app. 2,765 SF), hauled as contaminated debris', 0, 38710.00, 'USAA carried room-by-room selective demolition ($27,652).', 1),
 ('tier1', 'Asbestos and lead abatement of the 1949 finishes exposed by full demolition (joint compound, texture, paint) — SCAQMD Rule 1403', 0, 25000.00, 'USAA carried testing and clearance only ($5,770); no removal.', 2),
 ('tier1', 'HEPA cleaning and encapsulation of all exposed framing, sheathing and subfloor after demolition (app. 14,900 SF) — IICRC S700 / S760', 0, 33525.00, 'USAA carried sealer on the finished drywall left in place only.', 3),
 ('tier1', 'Drywall — balance to re-board every wall and ceiling after full demolition (app. 6,660 SF)', 0, 39960.00, 'USAA carried about 8,250 SF of the 14,909 SF.', 4),
 ('tier1', 'Interior paint — balance of walls and ceilings not in the USAA scope (app. 6,660 SF)', 0, 24975.00, 'USAA carried about 8,250 SF.', 5),
 ('tier1', 'General conditions for a 36-week full-scope job: supervision, temporary power / toilet / fence, dust control and negative air, protection, final clean', 0, 81000.00, 'Not carried — Xactimate overhead and profit is not jobsite conditions.', 6),
 -- Tier 2 — building code upgrades
 ('tier2', 'Structural — east wing (1949 construction, app. 1,200 SF): new plywood shear walls, holdowns, anchor bolts, straps and ties once the stucco-over-lath lateral system is removed (2026 LABC Ch. 16 / 23)', 0, 19200.00, 'USAA carried framing repair at damaged areas only ($27,733 whole house).', 1),
 ('tier2', 'Structural — west wing (2015 addition, app. 1,300 SF): verify the 2014 LABC shear walls, holdowns and footings; repair heat-exposed members; update hardware where required', 0, 7800.00, 'Within the $27,733 above.', 2),
 ('tier2', 'New electrical rough-in, whole house: AFCI / GFCI, tamper-resistant receptacles, required circuits, interconnected smoke and CO (2025 CEC 210.8, 210.12, 406.12; CRC R314 / R315)', 0, 55300.00, 'USAA carried openings by count and a 200A panel ($30,656) with the 1949 wiring left in place.', 3),
 ('tier2', 'New plumbing rough: supply re-pipe and DWV, venting, pressure-balanced valves, low-flow fixtures, water heater to current code (2025 CPC Ch. 6, 7, 9; 408.3; 507.2)', 0, 47005.00, 'USAA carried four plumber hours.', 4),
 ('tier2', 'New HVAC: Title 24 heat-pump system, new ducting in the opened cavities, duct leakage testing and HERS verification, mechanical ventilation (Title 24 §150.2(b), §150.0(o)) — balance beyond USAA', 0, 30000.00, 'USAA carried equipment replacement and duct cleaning ($22,436).', 5),
 ('tier2', 'Low-voltage rough: interconnected smoke / CO, data, doorbell and security', 0, 8500.00, 'Not carried.', 6),
 ('tier2', 'Whole-house insulation to current Title 24 values (walls R-15 / ceiling R-38), balance beyond USAA quantities', 0, 13725.00, 'USAA carried about 1,390 SF of batt and 392 SF of blown insulation ($5,793).', 7),
 -- Tier 3 — fire preventative measures
 ('tier3', 'Residential fire sprinkler system — triggered by an alteration exceeding 50% of the structure (LAMC 91.903.2.8; CRC R313)', 0, 30415.00, 'Not carried.', 1),
 ('tier3', 'Chapter 7A / VHFHSZ exterior compliance on the rebuilt envelope: ignition-resistant siding and soffits, ember-resistant vents, 7A-rated glazing at replaced openings, Class A roof assembly, ignition-resistant decking (CBC Ch. 7A / CRC R337)', 0, 32000.00, 'USAA carried like-for-like stucco, cedar siding and wood windows.', 2),
 -- Tier 4 — soft costs (at cost)
 ('tier4', 'Architect — permit set, construction documents, finish schedules and construction administration', 0, 45000.00, 'Not carried.', 1),
 ('tier4', 'Structural engineer — calculations and drawings to the 2026 LABC / ASCE 7-22, plan-check responses, site observations', 0, 22000.00, 'Not carried.', 2),
 ('tier4', 'Civil engineer — drainage and grading plan, site utilities (Special Grading Area)', 0, 9500.00, 'Not carried.', 3),
 ('tier4', 'MEP engineering — mechanical, plumbing and electrical plans', 0, 9000.00, 'Not carried.', 4),
 ('tier4', 'Geotechnical report and foundation observation', 0, 12000.00, 'Not carried.', 5),
 ('tier4', 'Title 24 energy compliance documentation and HERS rater verification', 0, 4500.00, 'Not carried.', 6),
 ('tier4', 'Survey — topographic and boundary survey for the permit set', 0, 4500.00, 'Not carried.', 7),
 ('tier4', 'LADBS plan check and permits for the full scope (structural, MEP, fire sprinkler), LAFD plan check, Coastal / dual-jurisdiction processing — beyond the $18,000 repair permits in the same-scope budget', 0, 12000.00, 'USAA carried $187.92 in permits, shown under add-ons above.', 8),
 ('tier4', 'Permit expediter', 0, 6500.00, 'Not carried.', 9),
 ('tier4', 'Special inspections / deputy inspector — epoxy anchors, holdowns, shear-wall nailing, structural observation', 0, 8500.00, 'Not carried.', 10)
) as v(section, category, carrier_amount, tcb_amount, note, sort_order);

-- check: tier subtotals should read 243170 / 181530 / 62415 / 133500
select section, count(*) as lines, sum(tcb_amount) as tcb from insurance_lines
where project_id = (select id from projects where name = '424 Almar Ave') and section like 'tier%' group by section order by section;
