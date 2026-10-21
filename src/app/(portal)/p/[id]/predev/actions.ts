"use server";

import { revalidatePath } from "next/cache";
import { requireBuilder, str, num, dateOrNull } from "@/lib/builder";
import { PREDEV_STATUSES, type Proposed } from "@/lib/predev";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureTrack } from "@/lib/predev-server";

type R = { error?: string; ok?: string } | null;
const bust = (id: string) => revalidatePath(`/p/${id}`, "layout");
const STATUS_KEYS = PREDEV_STATUSES.map((s) => s[0]) as string[];
const isoOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Save one agency card (applies, contact, dates, status, notes). */
export async function saveTrack(projectId: string, agency: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const appliesRaw = str(f, "applies");
  const status = str(f, "status");
  const row = {
    applies: appliesRaw === "yes" ? true : appliesRaw === "no" ? false : null,
    status: STATUS_KEYS.includes(status) ? status : "not_started",
    contact_name: str(f, "contact_name"), contact_email: str(f, "contact_email"), contact_phone: str(f, "contact_phone"),
    case_number: str(f, "case_number"),
    submitted_date: dateOrNull(f, "submitted_date"), est_completion: dateOrNull(f, "est_completion"),
    notes: str(f, "notes"), updated_at: new Date().toISOString(),
  };
  if (row.applies === false) row.status = "not_required";
  try {
    const trackId = await ensureTrack(supabase, projectId, agency);
    const { error } = await supabase.from("predev_tracks").update(row).eq("id", trackId);
    bust(projectId);
    return error ? { error: error.message } : { ok: "Saved." };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

/** Add or edit a fee line (requested and/or paid). */
export async function saveFee(projectId: string, agency: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const feeId = str(f, "fee_id");
  const amt = (k: string) => (str(f, k) === "" ? null : num(f, k));
  const row = {
    description: str(f, "description"),
    requested_amount: amt("requested_amount"), requested_date: dateOrNull(f, "requested_date"),
    paid_amount: amt("paid_amount"), paid_date: dateOrNull(f, "paid_date"),
  };
  if (!row.description && row.requested_amount == null && row.paid_amount == null) return { error: "Enter a description or an amount." };
  try {
    const trackId = await ensureTrack(supabase, projectId, agency);
    const q = feeId ? supabase.from("predev_fees").update(row).eq("id", feeId) : supabase.from("predev_fees").insert({ ...row, project_id: projectId, track_id: trackId });
    const { error } = await q;
    bust(projectId);
    return error ? { error: error.message } : { ok: "Saved." };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}
export async function deleteFee(projectId: string, feeId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("predev_fees").delete().eq("id", feeId).eq("project_id", projectId);
  bust(projectId);
}

/** Tim's own note on the timeline (posts as accepted straight away). */
export async function addActivity(projectId: string, agency: string, _p: R, f: FormData): Promise<R> {
  const { supabase, user } = await requireBuilder();
  const summary = str(f, "summary");
  if (!summary) return { error: "Write what happened." };
  try {
    const trackId = await ensureTrack(supabase, projectId, agency);
    const { error } = await supabase.from("predev_activity").insert({
      project_id: projectId, track_id: trackId, summary, activity_date: dateOrNull(f, "activity_date") ?? new Date().toISOString().slice(0, 10),
      source: "manual", state: "accepted", decided_by: user.id, decided_at: new Date().toISOString(),
    });
    bust(projectId);
    return error ? { error: error.message } : { ok: "Added." };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

/** Apply what an email suggested to the agency card. Fees become ledger lines; a payment settles the matching open fee. */
async function applyProposed(supabase: SupabaseClient, projectId: string, trackId: string, p: Proposed) {
  const upd: Record<string, unknown> = {};
  if (p.status && STATUS_KEYS.includes(p.status)) upd.status = p.status;
  if (isoOrNull(p.submitted_date)) upd.submitted_date = p.submitted_date;
  if (isoOrNull(p.est_completion)) upd.est_completion = p.est_completion;
  if (p.case_number) upd.case_number = String(p.case_number).slice(0, 80);
  if (p.contact?.name) upd.contact_name = p.contact.name.slice(0, 120);
  if (p.contact?.email) upd.contact_email = p.contact.email.slice(0, 160);
  if (p.contact?.phone) upd.contact_phone = p.contact.phone.slice(0, 40);
  if (Object.keys(upd).length) { upd.applies = true; upd.updated_at = new Date().toISOString(); await supabase.from("predev_tracks").update(upd).eq("id", trackId); }
  if (p.fee_requested && (p.fee_requested.amount != null || p.fee_requested.description)) {
    await supabase.from("predev_fees").insert({ project_id: projectId, track_id: trackId, description: p.fee_requested.description ?? "Fee", requested_amount: p.fee_requested.amount ?? null, requested_date: isoOrNull(p.fee_requested.date) });
  }
  if (p.fee_paid && p.fee_paid.amount != null) {
    const { data: open } = await supabase.from("predev_fees").select("id, requested_amount, description").eq("track_id", trackId).is("paid_amount", null).order("requested_date", { ascending: false });
    const match = (open ?? []).find((o) => o.requested_amount != null && Math.abs(Number(o.requested_amount) - Number(p.fee_paid!.amount)) < 0.01) ?? (open ?? [])[0];
    if (match) await supabase.from("predev_fees").update({ paid_amount: p.fee_paid.amount, paid_date: isoOrNull(p.fee_paid.date) }).eq("id", match.id);
    else await supabase.from("predev_fees").insert({ project_id: projectId, track_id: trackId, description: p.fee_paid.description ?? "Fee paid", paid_amount: p.fee_paid.amount, paid_date: isoOrNull(p.fee_paid.date) });
  }
}

/** Accept an email suggestion — optionally with Tim's edited wording/agency — and apply its updates. */
export async function acceptActivity(projectId: string, activityId: string, _p: R, f: FormData): Promise<R> {
  const { supabase, user } = await requireBuilder();
  const { data: a } = await supabase.from("predev_activity").select("*").eq("id", activityId).eq("project_id", projectId).maybeSingle();
  if (!a) return { error: "That suggestion is gone." };
  const agency = str(f, "agency") || null;
  const summary = str(f, "summary") || a.summary;
  const applyUpdates = f.get("apply_updates") === "on";
  try {
    const trackId = agency ? await ensureTrack(supabase, projectId, agency) : a.track_id;
    if (!trackId) return { error: "Pick which agency this belongs to." };
    if (applyUpdates) await applyProposed(supabase, projectId, trackId, (a.proposed ?? {}) as Proposed);
    const { error } = await supabase.from("predev_activity").update({
      state: "accepted", summary, track_id: trackId, activity_date: dateOrNull(f, "activity_date") ?? a.activity_date, decided_by: user.id, decided_at: new Date().toISOString(),
    }).eq("id", activityId);
    bust(projectId);
    return error ? { error: error.message } : { ok: applyUpdates ? "Accepted and applied." : "Accepted (card left unchanged)." };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

export async function rejectActivity(projectId: string, activityId: string) {
  const { supabase, user } = await requireBuilder();
  await supabase.from("predev_activity").update({ state: "rejected", decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", activityId).eq("project_id", projectId);
  bust(projectId);
}
export async function deleteActivity(projectId: string, activityId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("predev_activity").delete().eq("id", activityId).eq("project_id", projectId);
  bust(projectId);
}
