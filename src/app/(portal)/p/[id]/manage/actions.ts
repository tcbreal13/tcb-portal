"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBuilder, num, str, dateOrNull, safeName } from "@/lib/builder";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/format";

type R = { error?: string; ok?: string } | null;
const bust = (id: string) => revalidatePath(`/p/${id}`, "layout");

/* ---------- Job settings ---------- */
export async function saveProject(id: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const { error } = await supabase.from("projects").update({
    name: str(f, "name"), address: str(f, "address"), client_names: str(f, "client_names"), description: str(f, "description"),
    current_phase: str(f, "current_phase"), schedule_status: str(f, "schedule_status") || "On track", schedule_note: str(f, "schedule_note"),
    contract_amount: num(f, "contract_amount"), target_completion: dateOrNull(f, "target_completion"), archived: f.get("archived") === "on",
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
export async function deleteRow(id: string, table: "phases" | "lookahead_items" | "daily_logs" | "budget_lines" | "pay_apps" | "change_orders" | "selections" | "documents" | "updates" | "messages", rowId: string) {
  const { supabase } = await requireBuilder();
  if (table === "documents") {
    const { data } = await supabase.from("documents").select("storage_path").eq("id", rowId).maybeSingle();
    if (data?.storage_path) await supabase.storage.from("documents").remove([data.storage_path]);
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
  const { error } = await (paId ? supabase.from("pay_apps").update(row).eq("id", paId) : supabase.from("pay_apps").insert(row));
  bust(id);
  return error ? { error: error.message } : { ok: "Saved." };
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
  const update = status && ["pending", "approved", "declined"].includes(status) ? { ...row, status, decided_date: status === "pending" ? null : (dateOrNull(f, "decided_date") ?? todayISO()) } : row;
  const { error } = await (coId ? supabase.from("change_orders").update(update).eq("id", coId) : supabase.from("change_orders").insert(update));
  bust(id);
  return error ? { error: error.message } : { ok: coId ? "Saved." : `${code} sent to the client.` };
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
  const file = f.get("file");
  const title = str(f, "title");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > 50 * 1024 * 1024) return { error: "Files must be under 50 MB." };
  const path = `${id}/${Date.now()}-${safeName(file.name)}`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) return { error: upErr.message };
  const { error } = await supabase.from("documents").insert({ project_id: id, title: title || file.name, category: str(f, "category") || "Other", doc_date: dateOrNull(f, "doc_date") ?? todayISO(), storage_path: path });
  bust(id);
  return error ? { error: error.message } : { ok: "Uploaded." };
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
  const { error } = await supabase.from("project_members").upsert({ project_id: id, user_id: userId });
  bust(id);
  return error ? { error: error.message } : { ok: existing ? `${email} now has access to this job.` : `Invitation sent to ${email}. They'll get an email with a link to set their password.` };
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
