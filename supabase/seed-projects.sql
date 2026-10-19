-- Seed TCB's active projects. Run once in Supabase → SQL Editor. Safe to re-run (skips names that already exist).
-- Budgets, schedules, pay apps and clients get added per job from the portal's Builder tools.

insert into projects (name, address, client_names)
select v.name, v.address, v.client_names
from (values
  ('354 Arno Way',            '354 Arno Way, Pacific Palisades, CA 90272',             'Mark & Karen Dawson'),
  ('424 Almar Ave',           '424 Almar Ave, Pacific Palisades, CA 90272',            'Donohue Residence'),
  ('504 N Marquette St',      '504 N Marquette St, Pacific Palisades, CA 90272',       ''),
  ('676 Marr St',             '676 Marr St, Los Angeles, CA',                          ''),
  ('678 Marr St',             '678 Marr St, Los Angeles, CA',                          ''),
  ('16026 W Junaluska Way',   '16026 W Junaluska Way, Pacific Palisades, CA 90272',    ''),
  ('9546 Monte Mar Dr',       '9546 Monte Mar Dr, Los Angeles, CA',                    ''),
  ('18434 Coastline Dr',      '18434 Coastline Dr, Malibu, CA 90265',                  'Ali Ghavami'),
  ('6823 De Longpre Ave',     '6823 De Longpre Ave, Los Angeles, CA',                  '6823 De Longpre Ave LLC'),
  ('490 N Bowling Green Way', '490 N Bowling Green Way, Los Angeles, CA',              'Deborah Lehman'),
  ('1026 W Berkeley',         '1026 W Berkeley, Los Angeles, CA',                      ''),
  ('1932 Idaho',              '1932 Idaho, Los Angeles, CA',                           '')
) as v(name, address, client_names)
where not exists (select 1 from projects p where p.name = v.name);
