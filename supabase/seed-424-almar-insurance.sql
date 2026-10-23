-- Seed: 424 Almar Ave — USAA estimate vs. TCB Palisades market budget (same scope), plus the
-- fire-rebuild change orders already approved and paid. Run after 011_insurance.sql. Safe to re-run.
--
-- Source: USAA estimate dated 9/30/2026 (Austin Nonte), recap by category pp. 97-99, and the 10/9/2026
-- settlement letter; TCB market re-pricing from "424 Almar Ave - USAA Estimate by Trade vs Palisades
-- Market.xlsx" (10/13/2026). USAA category values are pre-tax, pre-O&P exactly as printed.
-- Scope USAA did not carry is NOT in this comparison — it lives in the rebuild budget (budget_lines).

insert into insurance_claims (project_id, carrier, claim_number, date_of_loss, estimate_date, estimate_by, settlement_date, carrier_label, tcb_label, intro, left_out, limits, settlement, notes)
values ((select id from projects where name = '424 Almar Ave'), 'USAA', '005401041-802', '2025-01-07', '2026-09-30', 'Austin Nonte, USAA', '2026-10-09', 'USAA estimate', 'TCB market budget',
 'USAA''s replacement-cost estimate for the main house, re-cut by trade exactly as USAA categorized it, with TCB''s current Pacific Palisades post-fire market pricing for the same scope beside each line. This compares like for like: the same work USAA priced, at what it costs to have it done here today. Items USAA did not carry at all are not in this comparison; they are part of the rebuild budget under Budget & billing.',
 'Sealing and painting the balance of the interior walls and ceilings — USAA carried about 8,200 SF of the 14,900 SF of wall and ceiling surface
Removal and replacement of the balance of the attic and ceiling insulation (smoke-saturated) — only about 1,400 SF of batt and 390 SF of blown insulation carried
Whole-house electrical devices, panels and junction boxes affected by soot — no cleaning or replacement itemized
Plumbing rough-in and fixture adjustments at the remodeled bathrooms and kitchen — USAA carried four plumber hours
Permits, plan check and LADBS inspections (repair, electrical, mechanical, plumbing) — USAA carried $187.92
General conditions: supervision, temporary power and toilet, dust control, protection and final clean — not carried
Structural engineer review of fire-exposed framing and the detached garage
All of the above is carried in the TCB rebuild budget under Budget & billing.',
 '[]'::jsonb,
 '[]'::jsonb,
 'Market rates are TCB draft Palisades rates from the 10/13/26 workbook (uplift 1.30x on lines not individually re-priced; O&P 10%/10%). Policy limits and settlement figures intentionally left off the client view for now.')
on conflict (project_id) do update set carrier = excluded.carrier, claim_number = excluded.claim_number, date_of_loss = excluded.date_of_loss, estimate_date = excluded.estimate_date, estimate_by = excluded.estimate_by, settlement_date = excluded.settlement_date, carrier_label = excluded.carrier_label, tcb_label = excluded.tcb_label, intro = excluded.intro, left_out = excluded.left_out, limits = excluded.limits, settlement = excluded.settlement, notes = excluded.notes, updated_at = now();

delete from insurance_lines where project_id = (select id from projects where name = '424 Almar Ave');
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'APPLIANCES', 5808.65, 9858.86, '', 1);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'CABINETRY', 44866.55, 75174.48, '', 2);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'CLEANING', 41060.62, 61059.38, '', 3);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'CONCRETE & ASPHALT', 18266.12, 26651.79, '', 4);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'GENERAL DEMOLITION', 27651.63, 41883.57, '', 5);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'DOORS', 14823.31, 30784.56, '', 6);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'DRYWALL', 38550.09, 59909.32, '', 7);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'ELECTRICAL', 30655.96, 66667.95, '', 8);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'HEAVY EQUIPMENT', 1440.0, 1872.0, '', 9);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FLOOR COVERING - CARPET', -1152.88, -1498.74, '', 10);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FLOOR COVERING - CERAMIC TILE', 9181.01, 12855.22, '', 11);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FLOOR COVERING - VINYL', 20088.28, 30952.79, '', 12);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FLOOR COVERING - WOOD', 79.8, 103.74, '', 13);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FENCING', 22906.36, 33674.24, '', 14);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FINISH CARPENTRY / TRIMWORK', 13137.12, 17078.26, '', 15);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FINISH HARDWARE', 1833.21, 2383.17, '', 16);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'FRAMING & ROUGH CARPENTRY', 27733.01, 37820.49, '', 17);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'HAZARDOUS MATERIAL REMEDIATION', 5769.9, 7575.97, '', 18);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'HEAT, VENT & AIR CONDITIONING', 22435.88, 41381.59, '', 19);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'INSULATION', 5792.6, 7887.73, '', 20);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'LIGHT FIXTURES', 16744.94, 24471.52, '', 21);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'LANDSCAPING', 115733.03, 183597.73, '', 22);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'MASONRY', 893.4, 1320.0, '', 23);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'MIRRORS & SHOWER DOORS', 17635.33, 20055.44, '', 24);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'PLUMBING', 14589.07, 19380.66, '', 25);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'PAINTING', 77504.73, 102727.23, '', 26);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'ROOFING', 17859.78, 25969.95, '', 27);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'SCAFFOLDING', 1740.6, 2160.0, '', 28);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'SIDING', 816.89, 1061.96, '', 29);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'SOFFIT, FASCIA, & GUTTER', 2392.4, 3534.08, '', 30);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'SPECIALTY ITEMS', 3280.91, 4265.18, '', 31);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'STUCCO & EXTERIOR PLASTER', 37503.34, 71378.87, '', 32);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'TILE', 20135.54, 44494.65, '', 33);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'TEMPORARY REPAIRS', 7933.5, 8684.0, '', 34);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'WINDOWS - SLIDING PATIO DOORS', 578.85, 752.51, '', 35);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'WINDOWS - SKYLIGHTS', 2543.48, 3306.52, '', 36);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'WINDOW TREATMENT', 320.0, 416.0, '', 37);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'WINDOWS - WOOD', 22296.72, 44593.01, '', 38);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'WATER EXTRACTION & REMEDIATION', 236.37, 307.28, '', 39);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'CLEANING (non-O&P)', 201.0, 261.3, '', 40);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'TOOLS (non-O&P)', 500.0, 650.0, '', 41);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'trade', 'USER DEFINED ITEMS (non-O&P)', 2417.5, 3142.75, '', 42);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'addon', 'Permits and fees', 187.92, 18000.0, 'USAA carried $187.92; LADBS repair, electrical, mechanical and plumbing permits and plan check', 1);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'addon', 'Material sales tax', 21357.02, 0, 'USAA 9.5% on materials; TCB market rates are tax-inclusive', 2);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'addon', 'Overhead / general conditions (10%)', 73317.27, 113060.7, '', 3);
insert into insurance_lines (project_id, section, category, carrier_amount, tcb_amount, note, sort_order) values ((select id from projects where name = '424 Almar Ave'), 'addon', 'Profit / fee (10%)', 73317.27, 124366.77, '', 4);

-- Fire-rebuild change orders: all approved and paid (paid dates carried as the CO date — correct under Change orders if needed)
update change_orders set status = 'approved', decided_date = sent_date, paid_date = sent_date where project_id = (select id from projects where name = '424 Almar Ave') and code in ('CO-001','CO-002','CO-004','CO-005','CO-006');
insert into change_orders (project_id, code, title, amount, description, status, sent_date, decided_date, paid_date)
values ((select id from projects where name = '424 Almar Ave'), 'MH-CO-001', 'Main house general — sealing all exterior openings and penetrations', 3688.0, 'Sealing every essential exterior opening and penetration (windows, doors, ducts, HVAC) with 6 mm plastic and 2x2 frames anchored into the stucco, after the Palisades Fire. About 4-5 days with two team members; labor and material. Billed under Main House General, separate from Phase 1 and Phase 2.', 'approved', '2025-03-10', '2025-03-10', '2025-03-10')
on conflict (project_id, code) do update set title = excluded.title, amount = excluded.amount, description = excluded.description, status = excluded.status, sent_date = excluded.sent_date, decided_date = excluded.decided_date, paid_date = excluded.paid_date;

-- switch the comparison tab on for the Donohues (client members on this job)
update project_members set access = array_append(access, 'insurance')
  where project_id = (select id from projects where name = '424 Almar Ave') and member_role = 'client' and not ('insurance' = any(access));

