-- Typed e-signatures on client decisions (selections and change orders).
alter table selections add column if not exists signed_name text;
alter table selections add column if not exists signed_by uuid references profiles (id);
alter table change_orders add column if not exists signed_name text;
