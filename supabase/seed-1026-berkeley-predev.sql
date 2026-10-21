-- 1026 W Berkeley Dr: pre-development data compiled from Tim's Outlook (Apr–Oct 2026).
-- Sources: Jesi Harris (Brian Silveira & Associates), Sheri Gould / Harvey Goodman Civil Engineer,
-- Van Bush & Robert Thibodeau (DU Architects), LA City Planning (Luis Lopez, Mayela Villa), BOE, LAFD.
-- Safe to re-run: tracks upsert, Coastal/SB 9 fees and imported activity are replaced.
do $$
declare
  p uuid;
  t_coastal uuid; t_mello uuid; t_sb9 uuid; t_ladbs uuid; t_county uuid;
begin
  select id into p from projects where name ilike '%1026%berkeley%' or address ilike '%1026%berkeley%' order by created_at limit 1;
  if p is null then raise exception '1026 W Berkeley project not found'; end if;

  update projects set project_types = (select array_agg(distinct x) from unnest(coalesce(project_types, '{}') || array['Pre-Development']) x) where id = p;

  insert into predev_tracks (project_id, agency, label, applies, status, contact_name, contact_email, contact_phone, case_number, submitted_date, est_completion, notes, sort_order)
  values
   (p, 'coastal', 'California Coastal Commission', true, 'in_review', 'Luis Lopez (Planning Asst., Venice Unit)', 'luis.c.lopez@lacity.org', '(213) 978-1359',
    'DIR-2026-2436-CDP-MEL-HCA', '2026-05-14', null,
    'Coastal Development Permit processed by LA City Planning (Venice Unit). Represented by Jesi Harris, Brian Silveira & Associates (jesi@bsilveira.associates, 704.277.7332). Intake: Mayela Villa (213) 526-6901. Case fee paid 9/29. Still open for hearing: notification package (radius map, 300-ft labels, mailing receipt, perjury statement). No hearing date in email yet.', 0),
   (p, 'mello', 'Mello Act', true, 'in_review', 'Luis Lopez (Planning Asst., Venice Unit)', 'luis.c.lopez@lacity.org', '(213) 978-1359',
    'DIR-2026-2436-CDP-MEL-HCA', '2026-05-14', null,
    'Mello determination is part of the DIR/CDP case. Planner asked for latest property tax bill showing the Homeowners'' Exemption; full RUD may be needed. Jesi: RUD in progress, home vacant since transfer to owner. As of 8/31 still awaiting the Mello Determination Letter.', 1),
   (p, 'sb9', 'SB 9', true, 'corrections', 'Luis Lopez (Planning Asst., Venice Unit)', 'luis.c.lopez@lacity.org', '(213) 978-1359',
    'AA-2026-2434-PMUL (BOE map 2026-2434-SB9)', '2026-05-14', null,
    'SB 9 urban lot split. Represented by Harvey Goodman Civil Engineer, Sheri Gould (sheri@harveygoodman.com, (310) 829-1037). Hold letter issued 6/10; planner warned 8/31 the case would terminate without fees by 9/30 — both Planning invoices now paid. BOE contact: justinea.allen@lacity.org. LAFD Hydrant & Access (John Conneally) approved 5/27.', 2),
   (p, 'ladbs', 'LADBS', true, 'approved', '', '', '', '', null, null,
    'LADBS Grading Division stamped the preliminary parcel map before the Planning filing (filing moved from 5/1 to 5/14 to wait for it). Building permits not yet applied for.', 4),
   (p, 'lacounty', 'LA County Building & Safety', false, 'not_required', '', '', '', '', null, null, 'City of Los Angeles jurisdiction.', 3)
  on conflict (project_id, agency) do update set
    label = excluded.label, applies = excluded.applies, status = excluded.status,
    contact_name = excluded.contact_name, contact_email = excluded.contact_email, contact_phone = excluded.contact_phone,
    case_number = excluded.case_number, submitted_date = excluded.submitted_date, est_completion = excluded.est_completion,
    notes = excluded.notes, updated_at = now();

  select id into t_coastal from predev_tracks where project_id = p and agency = 'coastal';
  select id into t_mello   from predev_tracks where project_id = p and agency = 'mello';
  select id into t_sb9     from predev_tracks where project_id = p and agency = 'sb9';
  select id into t_ladbs   from predev_tracks where project_id = p and agency = 'ladbs';

  delete from predev_fees where project_id = p and track_id in (t_coastal, t_sb9);
  insert into predev_fees (project_id, track_id, description, requested_amount, requested_date, paid_amount, paid_date) values
   (p, t_coastal, 'City Planning case fee — DIR/CDP, Mello, Venice sign-off, Env. Assessment (inv 108896; +$602.92 card fee)', 24213.78, '2026-05-14', 24213.78, '2026-09-29'),
   (p, t_coastal, 'GC Mapping hearing-notification retainer (radius map & labels)', 414.00, '2026-06-18', 414.00, '2026-07-24'),
   (p, t_sb9, 'City Planning lot split fee — AA-2026-2434-PMUL (inv 108895; +$260.21 card fee)', 10450.08, '2026-05-14', 10450.08, '2026-09-01'),
   (p, t_sb9, 'Bureau of Engineering SB 9 map review — Map 2026-2434-SB9 (+$136.95 card fee)', 5500.00, '2026-07-01', 5500.00, '2026-08-31'),
   (p, t_sb9, 'LAFD Hydrant & Access plan check (2nd receipt, MOD#H26-154434)', 379.00, '2026-05-21', 379.00, '2026-05-21');

  delete from predev_activity where project_id = p and source = 'email' and email_subject like '%(imported)%';
  insert into predev_activity (project_id, track_id, activity_date, summary, source, state, email_from, email_subject, decided_at) values
   (p, t_ladbs,   '2026-04-30', 'LADBS Grading Division is stamping the preliminary parcel map; the Planning filing appointment moved to May 14 to wait for it.', 'email','accepted','Jesi Harris','1026 BERKELEY UPDATED SET (imported)', now()),
   (p, t_sb9,     '2026-05-14', 'SB 9 lot split filed with LA City Planning as AA-2026-2434-PMUL (Harvey Goodman Civil Engineer representing). Fee invoice issued.', 'email','accepted','Sheri Gould','AA-2026-2434-PMUL / 1026 W Berkeley (imported)', now()),
   (p, t_coastal, '2026-05-14', 'Coastal Development Permit case DIR-2026-2436-CDP-MEL-HCA filed with LA City Planning (Jesi Harris representing). Invoice covers CDP, Venice sign-off and Environmental Assessment.', 'email','accepted','Jesi Harris','DIR-2026-2436-CDP-MEL-HCA / 1026 W Berkeley (imported)', now()),
   (p, t_sb9,     '2026-05-21', 'LAFD Hydrant & Access plan check fee paid ($379).', 'email','accepted','Van Bush','Payment Information — Fire Department (imported)', now()),
   (p, t_sb9,     '2026-05-27', 'LAFD Hydrant & Access Unit stamped the plans approved.', 'email','accepted','Van Bush','berkeley sb9 (imported)', now()),
   (p, t_sb9,     '2026-06-10', 'City Planning issued a hold letter on the lot split. Survey team submitted the parcel map, PZA and Venice Neighborhood Council proof of mailing.', 'email','accepted','Sheri Gould','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_mello,   '2026-06-10', 'Proof of homeowner occupancy submitted for the Mello determination, with the RPO RUD letter and Notice of Intent posting proof.', 'email','accepted','Jesi Harris','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_coastal, '2026-06-11', 'Updated plan set submitted per planner comments (parking counts, exterior materials, notes for both houses).', 'email','accepted','Jesi Harris','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_coastal, '2026-06-15', 'Planner listed what is left before a hearing: pay both invoices, hearing notification package (radius map, 300-ft labels, mailing receipt, perjury statement), and square footages on the Character Analysis.', 'email','accepted','Luis Lopez','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_mello,   '2026-06-15', 'Planner asked for the latest property tax bill showing the Homeowners'' Exemption; a full RUD may be needed. RUD in progress.', 'email','accepted','Luis Lopez','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_coastal, '2026-06-16', 'Updated Character Analysis with streetscape square footages submitted.', 'email','accepted','Jesi Harris','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_coastal, '2026-06-18', 'Proposal received from GC Mapping (City-approved notification contractor) for hearing notices and site posting.', 'email','accepted','Jesi Harris','Notification Contract Proposals (imported)', now()),
   (p, t_sb9,     '2026-07-01', 'Bureau of Engineering issued the SB 9 map review invoice (Map 2026-2434-SB9), needed for the hearing report.', 'email','accepted','Sheri Gould','Bureau of Engineering Invoice Generated (imported)', now()),
   (p, t_coastal, '2026-07-24', 'GC Mapping notification retainer paid ($414).', 'email','accepted','Jesi Harris','Outstanding Items for 811 Howard and 1026 Berkeley (imported)', now()),
   (p, t_sb9,     '2026-08-31', 'Bureau of Engineering map review fee paid ($5,500).', 'email','accepted','Tim Hubar','Bureau of Engineering Invoice (imported)', now()),
   (p, t_sb9,     '2026-08-31', 'Planner set a deadline: both Planning invoices must be paid by September 30 or the case is terminated. Remaining hold-letter documents submitted.', 'email','accepted','Luis Lopez','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_mello,   '2026-08-31', 'Still awaiting the Mello Determination Letter from Planning.', 'email','accepted','Jesi Harris','Hold letter For Case No.: AA-2026-2434-PMUL (imported)', now()),
   (p, t_sb9,     '2026-09-01', 'Lot split Planning fee paid ($10,450.08).', 'email','accepted','Tim Hubar','DIR-2026-2436-CDP-MEL-HCA / 1026 W Berkeley (imported)', now()),
   (p, t_coastal, '2026-09-29', 'CDP case fee paid ($24,213.78) ahead of the September 30 deadline; case stays active.', 'email','accepted','Tim Hubar','City of LA Planning: Payment Accepted (imported)', now());
end $$;

select agency, status, case_number, submitted_date,
  (select count(*) from predev_fees f where f.track_id = t.id) fees,
  (select count(*) from predev_activity a where a.track_id = t.id) acts
from predev_tracks t join projects pr on pr.id = t.project_id
where pr.name ilike '%1026%berkeley%' order by sort_order;
