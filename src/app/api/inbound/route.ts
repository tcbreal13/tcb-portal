import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhook, htmlToText, extractFromEmail, type ProjectHint } from "@/lib/inbound";
import { ensureTrack } from "@/lib/predev-server";
import { emailPredevSuggestion } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/inbound — Resend "email.received" webhook for permits@tcbbuilder.com.
 * Verifies the signature, fetches the body, lets Claude file it under a job + agency,
 * and stores it as a PENDING suggestion. Nothing reaches the client until Tim accepts it.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers, process.env.RESEND_WEBHOOK_SECRET ?? "")) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let evt: { type?: string; data?: { email_id?: string; from?: string; to?: string[]; subject?: string; created_at?: string } };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  if (evt.type !== "email.received" || !evt.data?.email_id) return NextResponse.json({ ok: true, skipped: evt.type });

  const admin = createAdminClient();
  const emailId = evt.data.email_id;
  const { data: dupe } = await admin.from("inbound_emails").select("id").eq("resend_id", emailId).maybeSingle();
  if (dupe) return NextResponse.json({ ok: true, duplicate: true });

  // Full content (the webhook only carries metadata).
  const key = process.env.RESEND_INBOUND_KEY || process.env.RESEND_API_KEY;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) { console.error("inbound fetch failed", res.status, await res.text().catch(() => "")); return NextResponse.json({ error: "Could not fetch email" }, { status: 502 }); }
  const m = (await res.json()) as { from?: string; to?: string[]; subject?: string; text?: string | null; html?: string | null; created_at?: string };
  const from = m.from ?? evt.data.from ?? "", subject = m.subject ?? evt.data.subject ?? "", receivedAt = m.created_at ?? evt.data.created_at ?? new Date().toISOString();
  const body = (m.text && m.text.trim()) || htmlToText(m.html ?? "");

  const { data: row, error: insErr } = await admin.from("inbound_emails").insert({
    resend_id: emailId, received_at: receivedAt, from_addr: from.slice(0, 300), to_addr: (m.to ?? evt.data.to ?? []).join(", ").slice(0, 300),
    subject: subject.slice(0, 500), body: body.slice(0, 60000),
  }).select("id").single();
  if (insErr || !row) return NextResponse.json({ error: insErr?.message ?? "insert failed" }, { status: 500 });

  // Jobs + what we already know about each (contacts, case numbers) to help Claude match.
  const [{ data: projects }, { data: tracks }] = await Promise.all([
    admin.from("projects").select("id, name, address").eq("archived", false),
    admin.from("predev_tracks").select("project_id, contact_email, case_number"),
  ]);
  const hints: ProjectHint[] = (projects ?? []).map((p) => ({
    id: p.id, name: p.name, address: p.address ?? "",
    contacts: (tracks ?? []).filter((t) => t.project_id === p.id && t.contact_email).map((t) => t.contact_email),
    cases: (tracks ?? []).filter((t) => t.project_id === p.id && t.case_number).map((t) => t.case_number),
  }));

  let ex;
  try { ex = await extractFromEmail({ from, subject, date: receivedAt.slice(0, 10), body }, hints); }
  catch (e) { console.error("extract failed", e); await admin.from("inbound_emails").update({ status: "unsorted" }).eq("id", row.id); return NextResponse.json({ ok: true, extracted: false }); }

  if (!ex.relevant) { await admin.from("inbound_emails").update({ status: "ignored", extracted: ex }).eq("id", row.id); return NextResponse.json({ ok: true, ignored: true }); }
  if (!ex.project_id) { await admin.from("inbound_emails").update({ status: "unsorted", extracted: ex }).eq("id", row.id); }
  else {
    const trackId = ex.agency ? await ensureTrack(admin, ex.project_id, ex.agency) : null;
    await admin.from("predev_activity").insert({
      project_id: ex.project_id, track_id: trackId, activity_date: ex.activity_date ?? receivedAt.slice(0, 10), summary: ex.summary,
      source: "email", state: "pending", email_id: row.id, email_from: from.slice(0, 300), email_subject: subject.slice(0, 300), proposed: ex.proposed,
    });
    await admin.from("inbound_emails").update({ status: "suggested", project_id: ex.project_id, agency: ex.agency, extracted: ex }).eq("id", row.id);
  }

  const projectName = (projects ?? []).find((p) => p.id === ex.project_id)?.name ?? null;
  await emailPredevSuggestion({ projectId: ex.project_id, projectName, agency: ex.agency, summary: ex.summary, from, subject }).catch((e) => console.error(e));
  return NextResponse.json({ ok: true, project: ex.project_id, agency: ex.agency });
}
