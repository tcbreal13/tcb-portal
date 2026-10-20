-- Attach documents to pay applications: invoice, G702/G703 pay app, conditional and unconditional waivers.
alter table pay_apps add column if not exists invoice_path text;
alter table pay_apps add column if not exists payapp_path text;
alter table pay_apps add column if not exists conditional_waiver_path text;
alter table pay_apps add column if not exists unconditional_waiver_path text;
