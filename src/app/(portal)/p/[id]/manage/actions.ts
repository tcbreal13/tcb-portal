"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBuilder, num, str, dateOrNull, safeName } from "@/lib/builder";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/format";
import { PAYAPP_DOCS } from "@/lib/types";
import { normalizeFolder, OTHER_FOLDER } from "@/lib/doc-folders";
import { typesFromForm } from "@/lib/project-types";
import { sectionsFromForm, isTier } from "@/lib/access";

type R = { error?: string; ok?: string } | null;
const bust = (id: string) => revalidatePath(`/p/${id}`, "layout");

/* ---------- Job settings ---------- */
export async function saveProject(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const { error } = await supabase.from("projects").update({
    name: str(f, "name"), address: str(f, "address"), client_names: str(f, "client_names"), description: str(f, "description"),
    current_phase: str(f, "current_phase"), schedule_status: str(f, "schedule_status") || "On track", schedule_note: str(f, "schedule_note"),
    contract_amount: num(f, "contract_amount"), target_completion: dateOrNull(f, "target_completion"), archived: f.get("archived") === "on", project_types: typesFromForm(f),
    budget_note: str(f, "budget_note"),
  }).eq("id", id);
  bust(id);
  return error ? { error: error.message } : { ok: "Saved." };
}

export async function createProject(_p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const name = str(f, "name");
  if (!name) return { error: "Give the job a name." };
  const { data, error } = await supabase.from("projects").insert({
    name, address: str(f, "address"), client_names: str(f, "client_names"), contract_amount: num(f, "contract_amount"), target_completion: dateOrNull(f, "target_completion"),
    project_types: typesFromForm(f),
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not create the project." };
  revalidatePath("/");
  redirect(`/p/${data.id}/manage/people`);
}

/* ---------- Phases and look-ahead ---------- */
export async function savePhase(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const phaseId = str(f, "phase_id");
  const row = { project_id: id, name: str(f, "name"), start_date: dateOrNull(f, "start_date"), end_date: dateOrNull(f, "end_date"), percent_complete: Math.max(0, Math.min(100, Math.round(num(f, "percent_complete")))), sort_order: Math.round(num(f, "sort_order")) };
  if (!row.name || !row.start_date || !row.end_date) return { error: "A phase needs a name, a start and a finish." };
  const q = phaseId ? supabase.from("phases").update(row).eq("id", phaseId) : supabase.from("phases").insert(row);
  const { error } = await q;
  bust(id);
  return error ? { error: error.message } : { ok: "Saved." };
}
export async function deleteRow(id: string, table: "phases" | "lookahead_items" | "daily_logs" | "budget_lines" | "pay_apps" | "change_orders" | "selections" | "documents" | "updates" | "messages" | "insurance_lines", rowId: string) {
  const { supabase } = await requireBuilder();
  if (table === "documents") {
    const { data } = await supabase.from("documents").select("storage_path").eq("id", rowId).maybeSingle();
    if (data?.storage_path) await supabase.storage.from("documents").remove([data.storage_path]);
  }
  if (table === "pay_apps") {
    const { data } = await supabase.from("pay_apps").select("invoice_path, payapp_path, conditional_waiver_path, unconditional_waiver_path").eq("id", rowId).maybeSingle();
    const paths = data ? Object.values(data).filter((p): p is string => !!p) : [];
    if (paths.length) await supabase.storage.from("documents").remove(paths);
  }
  if (table === "daily_logs") {
    const { data } = await supabase.from("log_photos").select("storage_path").eq("log_id", rowId);
    if (data?.length) await supabase.storage.from("photos").remove(data.map((p) => p.storage_path));
  }
  const { error } = await supabase.from(table).delete().eq("id", rowId).eq("project_id", id);
  bust(id);
  return { error: error?.message };
}
export async function addLookahead(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const item_date = dateOrNull(f, "item_date"), body = str(f, "body");
  if (!item_date || !body) return { error: "Pick a date and describe the item." };
  const { error } = await supabase.from("lookahead_items").insert({ project_id: id, item_date, body });
  bust(id);
  return error ? { error: error.message } : { ok: "Added." };
}

/* ---------- Daily logs with photos ---------- */
export async function postDailyLog(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase, user } = await requireBuilder();
  const log_date = dateOrNull(f, "log_date") ?? todayISO();
  const note = str(f, "note");
  if (!note) return { error: "Write what happened on site." };
  const { data: log, error } = await supabase.from("daily_logs").insert({ project_id: id, log_date, weather: str(f, "weather"), crew: str(f, "crew"), note, created_by: user.id }).select("id").single();
  if (error || !log) return { error: error?.message ?? "Could not save the log." };

  const files = f.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0);
  const failures: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) { failures.push(`${file.name} (not an image)`); continue; }
    if (file.size > 25 * 1024 * 1024) { failures.push(`${file.name} (over 25 MB)`); continue; }
    const path = `${id}/${log.id}/${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { failures.push(`${file.name} (${upErr.message})`); continue; }
    await supabase.from("log_photos").insert({ log_id: log.id, project_id: id, storage_path: path, caption: file.name.replace(/\.[^.]+$/, "") });
  }
  bust(id);
  return failures.length ? { error: `Log posted, but these photos failed: ${failures.join(", ")}` } : { ok: `Posted with ${files.length} photo${files.length === 1 ? "" : "s"}.` };
}

/* ---------- Budget and pay apps ---------- */
export async function saveBudgetLine(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const lineId = str(f, "line_id");
  const row = { project_id: id, category: str(f, "category"), budget: num(f, "budget"), billed: num(f, "billed"), sort_order: Math.round(num(f, "sort_order")) };
  if (!row.category) return { error: "Name the category." };
  const { error } = await (lineId ? supabase.from("budget_lines").update(row).eq("id", lineId) : supabase.from("budget_lines").insert(row));
  bust(id);
  return error ? { error: error.message } : { ok: "Saved." };
}
export async function savePayApp(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const paId = str(f, "pa_id");
  const row = { project_id: id, number: Math.round(num(f, "number")), period_ending: dateOrNull(f, "period_ending"), amount: num(f, "amount"), status: str(f, "status") === "paid" ? "paid" : "due", status_date: dateOrNull(f, "status_date"), waiver_note: str(f, "waiver_note") };
  if (!row.number || !row.period_ending) return { error: "A pay app needs a number and a period-ending date." };

  // Attached PDFs: invoice, G702/G703, conditional and unconditional waivers. Only replace a slot when a new file is chosen.
  const docs: Record<string, string> = {};
  const failures: string[] = [];
  for (const [col, label, slug] of PAYAPP_DOCS) {
    const file = f.get(`doc_${slug}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > 50 * 1024 * 1024) { failures.push(`${label} is over 50 MB`); continue; }
    const path = `${id}/payapps/${row.number}/${slug}-${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/pdf" });
    if (upErr) { failures.push(`${label}: ${upErr.message}`); continue; }
    docs[col] = path;
  }
  for (const [col, , slug] of PAYAPP_DOCS) if (f.get(`remove_${slug}`) === "on") docs[col] = null as unknown as string;

  const full = { ...row, ...docs };
  const { error } = await (paId ? supabase.from("pay_apps").update(full).eq("id", paId) : supabase.from("pay_apps").insert(full));
  bust(id);
  if (error) return { error: error.message };
  return failures.length ? { error: `Saved, but: ${failures.join("; ")}` } : { ok: Object.keys(docs).length ? "Saved with documents." : "Saved." };
}

/* ---------- Change orders ---------- */
export async function saveChangeOrder(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const coId = str(f, "co_id");
  let code = str(f, "code");
  if (!code) {
    const { count } = await supabase.from("change_orders").select("id", { count: "exact", head: true }).eq("project_id", id);
    code = `CO-${String((count ?? 0) + 1).padStart(2, "0")}`;
  }
  const row = { project_id: id, code, title: str(f, "title"), amount: num(f, "amount"), description: str(f, "description"), sent_date: dateOrNull(f, "sent_date") ?? todayISO() };
  if (!row.title || !row.description) return { error: "A change order needs a title and a description." };
  const status = str(f, "status");
  const paid = { paid_date: status === "approved" ? dateOrNull(f, "paid_date") : null };
  const update = status && ["pending", "approved", "declined"].includes(status) ? { ...row, ...paid, status, decided_date: status === "pending" ? null : (dateOrNull(f, "decided_date") ?? todayISO()) } : row;
  const { error } = await (coId ? supabase.from("change_orders").update(update).eq("id", coId) : supabase.from("change_orders").insert(update));
  bust(id);
  return error ? { error: error.message } : { ok: coId ? "Saved." : `${code} sent to the client.` };
}

/* ---------- Insurance budget comparison ---------- */
function moneyLines(f: FormData, key: string) {
  // textarea, one "Label | amount" per line
  return str(f, key).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, amt] = l.split("|").map((x) => x.trim());
    return { label: label ?? "", amount: Number(String(amt ?? "0").replace(/[^0-9.-]/g, "")) || 0 };
  }).filter((x) => x.label);
}
export async function saveInsuranceClaim(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const row = {
    project_id: id, carrier: str(f, "carrier"), claim_number: str(f, "claim_number"), date_of_loss: dateOrNull(f, "date_of_loss"),
    estimate_date: dateOrNull(f, "estimate_date"), estimate_by: str(f, "estimate_by"), settlement_date: dateOrNull(f, "settlement_date"),
    carrier_label: str(f, "carrier_label") || "Carrier estimate", tcb_label: str(f, "tcb_label") || "TCB market budget",
    intro: str(f, "intro"), left_out: str(f, "left_out"), notes: str(f, "notes"), limits: moneyLines(f, "limits"), settlement: moneyLines(f, "settlement"), updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("insurance_claims").upsert(row, { onConflict: "project_id" });
  bust(id);
  return error ? { error: error.message } : { ok: "Saved." };
}
export async function saveInsuranceLine(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const lineId = str(f, "line_id");
  const section = str(f, "section");
  if (!["trade", "addon", "gap"].includes(section)) return { error: "Pick a section." };
  const row = { project_id: id, section, category: str(f, "category"), carrier_amount: num(f, "carrier_amount"), tcb_amount: num(f, "tcb_amount"), note: str(f, "note"), sort_order: num(f, "sort_order") };
  if (!row.category) return { error: "A line needs a trade or item name." };
  const { error } = await (lineId ? supabase.from("insurance_lines").update(row).eq("id", lineId) : supabase.from("insurance_lines").insert(row));
  bust(id);
  return error ? { error: error.message } : { ok: lineId ? "Saved." : "Added." };
}
/** Paste rows from Excel: "Trade<TAB>carrier<TAB>tcb[<TAB>note]" per line; replaces the section when asked. */
export async function importInsuranceLines(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const section = str(f, "section");
  if (!["trade", "addon", "gap"].includes(section)) return { error: "Pick a section." };
  const money = (v: string) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const rows = str(f, "paste").split("\n").map((l) => l.replace(/\r/g, "")).filter((l) => l.trim()).map((l, i) => {
    const cells = l.includes("\t") ? l.split("\t") : l.split(",");
    return { project_id: id, section, category: (cells[0] ?? "").trim(), carrier_amount: money(cells[1]), tcb_amount: money(cells[2]), note: (cells[3] ?? "").trim(), sort_order: i + 1 };
  }).filter((r) => r.category && !/^(trade|category|item)$/i.test(r.category));
  if (!rows.length) return { error: "Nothing to import — paste one line per trade: name, carrier amount, TCB amount." };
  if (str(f, "replace") === "on") await supabase.from("insurance_lines").delete().eq("project_id", id).eq("section", section);
  const { error } = await supabase.from("insurance_lines").insert(rows);
  bust(id);
  return error ? { error: error.message } : { ok: `${rows.length} line${rows.length === 1 ? "" : "s"} imported.` };
}

/* ---------- Selections ---------- */
export async function saveSelection(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const item = str(f, "item");
  if (!item) return { error: "Name the selection." };
  const names = f.getAll("opt_name").map(String), prices = f.getAll("opt_price").map(String);
  const opts = names.map((n, i) => ({ name: n.trim(), price_delta: Number(String(prices[i] ?? "0").replace(/[^0-9.-]/g, "")) || 0, sort_order: i })).filter((o) => o.name);
  if (!opts.length) return { error: "Add at least one option." };
  const { data: sel, error } = await supabase.from("selections").insert({ project_id: id, item, needed_by: dateOrNull(f, "needed_by") }).select("id").single();
  if (error || !sel) return { error: error?.message ?? "Could not save." };
  const { error: e2 } = await supabase.from("selection_options").insert(opts.map((o) => ({ ...o, selection_id: sel.id, project_id: id })));
  bust(id);
  return e2 ? { error: e2.message } : { ok: "Selection posted." };
}
export async function reopenSelection(id: string, selId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("selections").update({ chosen_option_id: null, chosen_at: null }).eq("id", selId).eq("project_id", id);
  bust(id);
}

/* ---------- Documents ---------- */
export async function uploadDocument(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const files = f.getAll("file").filter((x): x is File => x instanceof File && x.size > 0);
  const title = str(f, "title");
  const category = normalizeFolder(str(f, "category") || OTHER_FOLDER);
  if (!files.length) return { error: "Choose at least one file." };
  const failures: string[] = []; let done = 0;
  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) { failures.push(`${file.name} (over 50 MB)`); continue; }
    const path = `${id}/${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (upErr) { failures.push(`${file.name} (${upErr.message})`); continue; }
    const docTitle = files.length === 1 && title ? title : file.name.replace(/\.[^.]+$/, "");
    const { error } = await supabase.from("documents").insert({ project_id: id, title: docTitle, category, doc_date: dateOrNull(f, "doc_date") ?? todayISO(), storage_path: path });
    if (error) failures.push(`${file.name} (${error.message})`); else done++;
  }
  bust(id);
  return failures.length ? { error: `${done} uploaded; failed: ${failures.join(", ")}` } : { ok: `${done} file${done === 1 ? "" : "s"} filed under ${category}.` };
}

/* ---------- Updates ---------- */
export async function postUpdate(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const body = str(f, "body");
  if (!body) return { error: "Write or draft an update first." };
  const { error } = await supabase.from("updates").insert({ project_id: id, update_date: dateOrNull(f, "update_date") ?? todayISO(), body });
  bust(id);
  return error ? { error: error.message } : { ok: "Posted. The client sees it on their Overview." };
}

/* ---------- People: invite and attach clients ---------- */
export async function inviteClient(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const email = str(f, "email").toLowerCase();
  const full_name = str(f, "full_name");
  if (!email.includes("@")) return { error: "Enter a valid email." };

  let admin;
  try { admin = createAdminClient(); } catch { return { error: "Inviting needs SUPABASE_SERVICE_ROLE_KEY set in Vercel." }; }

  // Find an existing user by email, or invite a new one (Supabase emails them a link to set a password).
  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) userId = existing.id;
  else {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name }, redirectTo: `${site}/auth/callback?next=/set-password` });
    if (error || !data.user) return { error: error?.message ?? "Invite failed." };
    userId = data.user.id;
  }
  if (full_name) await admin.from("profiles").update({ full_name }).eq("id", userId).eq("full_name", "");
  const tier = isTier(str(f, "member_role")) ? str(f, "member_role") : "client";
  const { error } = await supabase.from("project_members").upsert({ project_id: id, user_id: userId, member_role: tier, access: sectionsFromForm(f) });
  const requestId = str(f, "request_id");
  if (!error && requestId) { await supabase.from("access_requests").update({ status: "done" }).eq("id", requestId); revalidatePath("/"); }
  bust(id);
  return error ? { error: error.message } : { ok: existing ? `${email} now has access to this job.` : `Invitation sent to ${email}. They'll get an email with a link to set their password.` };
}
/** Change one person's tier and section switches on this job. */
export async function saveMemberAccess(id: string, userId: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const tier = str(f, "member_role");
  if (!isTier(tier)) return { error: "Pick a role." };
  const { error } = await supabase.from("project_members").update({ member_role: tier, access: sectionsFromForm(f) }).eq("project_id", id).eq("user_id", userId);
  bust(id);
  return error ? { error: error.message } : { ok: "Saved. Takes effect the next time they open a page." };
}
export async function removeMember(id: string, userId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("project_members").delete().eq("project_id", id).eq("user_id", userId);
  bust(id);
}
export async function resendInvite(email: string): Promise<R> {
  await requireBuilder();
  try {
    const admin = createAdminClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/callback?next=/set-password` });
    return error ? { error: error.message } : { ok: `Set-password link sent to ${email}.` };
  } catch { return { error: "Needs SUPABASE_SERVICE_ROLE_KEY." }; }
}

/* ---------- Detailed schedule (tasks under phases) ---------- */
import { tasksFromCsv, workDays, percentFromTasks } from "@/lib/schedule";
import type { TaskStatus } from "@/lib/types";

const TASK_STATUSES: TaskStatus[] = ["planned", "in_progress", "complete"];

/** Keep each phase's dates and % in step with its tasks, so the overview and the phase bars stay honest. */
async function syncPhases(supabase: Awaited<ReturnType<typeof requireBuilder>>["supabase"], projectId: string) {
  const [{ data: phases }, { data: tasks }] = await Promise.all([
    supabase.from("phases").select("id").eq("project_id", projectId),
    supabase.from("schedule_tasks").select("phase_id, start_date, end_date, duration_days, status").eq("project_id", projectId),
  ]);
  for (const ph of phases ?? []) {
    const ts = (tasks ?? []).filter((t) => t.phase_id === ph.id);
    if (!ts.length) continue;
    const start = ts.reduce((m, t) => (t.start_date < m ? t.start_date : m), ts[0].start_date);
    const end = ts.reduce((m, t) => (t.end_date > m ? t.end_date : m), ts[0].end_date);
    const pct = percentFromTasks(ts) ?? 0;
    await supabase.from("phases").update({ start_date: start, end_date: end, percent_complete: pct }).eq("id", ph.id);
  }
}

export async function saveTask(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const taskId = str(f, "task_id");
  const start = dateOrNull(f, "start_date"); let end = dateOrNull(f, "end_date");
  const title = str(f, "title");
  if (!title || !start) return { error: "A task needs a title and a start date." };
  if (!end || end < start) end = start;
  const durRaw = str(f, "duration_days");
  const milestone = f.get("milestone") === "on";
  const duration = milestone ? 0 : durRaw === "" ? workDays(start, end) : Math.max(1, Math.round(num(f, "duration_days")));
  const statusRaw = str(f, "status") as TaskStatus;
  const row = {
    project_id: id, phase_id: str(f, "phase_id") || null, title, start_date: start, end_date: end, duration_days: duration,
    assigned_to: str(f, "assigned_to"), cost_code: str(f, "cost_code"), predecessors: str(f, "predecessors"), predecessor_type: str(f, "predecessor_type"), lag_days: str(f, "lag_days"),
    show_client: f.get("show_client") === "on", status: TASK_STATUSES.includes(statusRaw) ? statusRaw : "planned", notes: str(f, "notes"),
    sort_order: str(f, "sort_order") === "" ? Math.round(new Date(start).getTime() / 864e5) : Math.round(num(f, "sort_order")),
  };
  const q = taskId ? supabase.from("schedule_tasks").update(row).eq("id", taskId) : supabase.from("schedule_tasks").insert(row);
  const { error } = await q;
  if (error) return { error: error.message };
  await syncPhases(supabase, id);
  bust(id);
  return { ok: "Saved." };
}

export async function setTaskStatus(id: string, taskId: string, status: TaskStatus) {
  const { supabase } = await requireBuilder();
  if (!TASK_STATUSES.includes(status)) return { error: "Bad status." };
  const { error } = await supabase.from("schedule_tasks").update({ status }).eq("id", taskId).eq("project_id", id);
  if (error) return { error: error.message };
  await syncPhases(supabase, id);
  bust(id);
  return {};
}

export async function deleteTask(id: string, taskId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("schedule_tasks").delete().eq("id", taskId).eq("project_id", id);
  await syncPhases(supabase, id);
  bust(id);
  return {};
}

/** Import a Buildertrend "Schedule Import" CSV (or our own export). Phases are created by name when missing. */
export async function importSchedule(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a CSV file." };
  const { tasks, errors } = tasksFromCsv(await file.text());
  if (!tasks.length) return { error: errors[0] ?? "No tasks found in that file." };
  const replace = f.get("replace") === "on";
  if (replace) await supabase.from("schedule_tasks").delete().eq("project_id", id);

  const { data: existing } = await supabase.from("phases").select("id, name, sort_order").eq("project_id", id);
  const phases = new Map((existing ?? []).map((p) => [p.name.trim().toLowerCase(), p.id]));
  let nextOrder = (existing ?? []).reduce((m, p) => Math.max(m, p.sort_order), 0);
  const phaseIdFor = async (raw: string) => {
    const name = raw.replace(/^\s*\d+\s*[-–.]\s*/, "").trim();
    if (!name) return null;
    const key = name.toLowerCase();
    if (phases.has(key)) return phases.get(key)!;
    const { data } = await supabase.from("phases").insert({ project_id: id, name, start_date: "2000-01-01", end_date: "2000-01-01", percent_complete: 0, sort_order: ++nextOrder }).select("id").single();
    if (data) phases.set(key, data.id);
    return data?.id ?? null;
  };
  const rows = [];
  let n = 0;
  for (const t of tasks) {
    const phase_id = await phaseIdFor(t.phase);
    rows.push({ project_id: id, phase_id, title: t.title, start_date: t.start_date, end_date: t.end_date, duration_days: t.duration_days, assigned_to: t.assigned_to, cost_code: t.cost_code, predecessors: t.predecessors, predecessor_type: t.predecessor_type, lag_days: t.lag_days, show_client: t.show_client, status: t.status, notes: t.notes, sort_order: ++n });
  }
  const { error } = await supabase.from("schedule_tasks").insert(rows);
  if (error) return { error: error.message };
  await syncPhases(supabase, id);
  bust(id);
  return { ok: `${rows.length} tasks imported${errors.length ? `; skipped ${errors.length}: ${errors.slice(0, 3).join(" ")}` : "."}` };
}
