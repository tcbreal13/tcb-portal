"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBuilder, str } from "@/lib/builder";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECTIONS, TIERS, isTier, type SectionKey } from "@/lib/access";
import { emailActivation } from "@/lib/email";
import { previewInviteJob } from "../view-as-actions";

type R = { error?: string; ok?: string } | null;
const ALL_KEYS = SECTIONS.map((s) => s.key as string);

/** Best guess at which job a request is about, from the street number + name they typed. */
function matchJob(hint: string, jobs: { id: string; name: string; address: string | null }[]) {
  const h = hint.toLowerCase();
  const num = h.match(/\d{2,6}/)?.[0];
  if (!num) return null;
  const words = h.replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  return jobs.find((j) => {
    const hay = `${j.name} ${j.address ?? ""}`.toLowerCase();
    return hay.includes(num) && (words.length === 0 || words.some((w) => hay.includes(w)));
  }) ?? jobs.find((j) => `${j.name} ${j.address ?? ""}`.toLowerCase().includes(num)) ?? null;
}

/** Turn an access request into a draft Tim can personalize. Re-opens the existing draft if there is one. */
export async function reviewRequest(requestId: string) {
  const { supabase } = await requireBuilder();
  const { data: existing } = await supabase.from("invites").select("id").eq("request_id", requestId).neq("status", "cancelled").maybeSingle();
  if (existing) redirect(`/invites/${existing.id}`);
  const { data: req } = await supabase.from("access_requests").select("*").eq("id", requestId).maybeSingle();
  if (!req) redirect("/");
  const { data: inv, error } = await supabase.from("invites").insert({ email: req.email, full_name: req.full_name, request_id: req.id }).select("id").single();
  if (error || !inv) throw new Error(error?.message ?? "Couldn't start the review.");
  const { data: jobs } = await supabase.from("projects").select("id, name, address").eq("archived", false);
  const job = matchJob(req.project_hint ?? "", jobs ?? []);
  if (job) await supabase.from("invite_jobs").insert({ invite_id: inv.id, project_id: job.id, member_role: "client", access: [...TIERS.client.sections] });
  redirect(`/invites/${inv.id}`);
}

/** Start a draft from a job's People page ("review before sending"). */
export async function draftFromPeople(projectId: string, f: FormData) {
  const { supabase } = await requireBuilder();
  const email = str(f, "email").toLowerCase();
  if (!email.includes("@")) return;
  const tier = isTier(str(f, "member_role")) ? str(f, "member_role") : "client";
  const access = f.getAll("access").map(String).filter((k) => ALL_KEYS.includes(k));
  const { data: inv } = await supabase.from("invites").insert({ email, full_name: str(f, "full_name"), request_id: str(f, "request_id") || null }).select("id").single();
  if (!inv) return;
  await supabase.from("invite_jobs").insert({ invite_id: inv.id, project_id: projectId, member_role: tier, access });
  redirect(`/invites/${inv.id}`);
}

/** Read the editor form: name, email, note, and one role + section set per job ticked. */
function parseEditor(f: FormData) {
  const jobIds = f.getAll("job").map(String).filter(Boolean);
  const jobs = jobIds.map((pid) => ({
    project_id: pid,
    member_role: isTier(str(f, `role_${pid}`)) ? str(f, `role_${pid}`) : "client",
    access: f.getAll(`access_${pid}`).map(String).filter((k) => ALL_KEYS.includes(k)),
  }));
  return { email: str(f, "email").toLowerCase(), full_name: str(f, "full_name"), note: str(f, "note").slice(0, 1500), jobs };
}

async function saveDraft(supabase: Awaited<ReturnType<typeof requireBuilder>>["supabase"], inviteId: string, d: ReturnType<typeof parseEditor>) {
  const { error } = await supabase.from("invites").update({ email: d.email, full_name: d.full_name, note: d.note, updated_at: new Date().toISOString() }).eq("id", inviteId);
  if (error) return error.message;
  await supabase.from("invite_jobs").delete().eq("invite_id", inviteId);
  if (d.jobs.length) {
    const { error: e2 } = await supabase.from("invite_jobs").insert(d.jobs.map((j) => ({ ...j, invite_id: inviteId })));
    if (e2) return e2.message;
  }
  return null;
}

/** Save button and Activate button share one form; the clicked button's `intent` decides. */
export async function submitInvite(inviteId: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const d = parseEditor(f);
  if (!d.email.includes("@")) return { error: "Enter a valid email." };
  const err = await saveDraft(supabase, inviteId, d);
  if (err) return { error: err };
  revalidatePath(`/invites/${inviteId}`); revalidatePath("/");
  const intent = str(f, "intent");
  if (intent.startsWith("preview:")) {
    const j = d.jobs.find((x) => x.project_id === intent.slice(8));
    if (j) await previewInviteJob(j.project_id, j.member_role, j.access, `/invites/${inviteId}`);
  }
  if (intent !== "activate") return { ok: "Draft saved. Nothing has been sent." };
  return activate(inviteId);
}

/** Create (or find) the account, grant the jobs, and email the activation link. */
async function activate(inviteId: string): Promise<R> {
  const { supabase } = await requireBuilder();
  const { data: inv } = await supabase.from("invites").select("*").eq("id", inviteId).maybeSingle();
  if (!inv || inv.status === "cancelled") return { error: "This invite was cancelled." };
  const { data: jobRows } = await supabase.from("invite_jobs").select("project_id, member_role, access, projects(name)").eq("invite_id", inviteId);
  const jobs = jobRows ?? [];
  if (!jobs.length) return { error: "Add at least one job before activating." };

  let admin;
  try { admin = createAdminClient(); } catch { return { error: "Activation needs SUPABASE_SERVICE_ROLE_KEY set in Vercel." }; }
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcbbuilder.com").replace(/\/$/, "");
  const email = String(inv.email).toLowerCase();

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  // A user who never finished an earlier invite still needs to set a password, so treat them as new.
  const isNewAccount = !existing || !existing.last_sign_in_at;
  const { data: gen, error: genErr } = existing && !isNewAccount
    ? await admin.auth.admin.generateLink({ type: "magiclink", email })
    : existing
      ? await admin.auth.admin.generateLink({ type: "recovery", email })
      : await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: inv.full_name } } });
  if (genErr || !gen?.user || !gen.properties?.hashed_token) return { error: genErr?.message ?? "Couldn't create the activation link." };
  const userId = gen.user.id;
  const linkType = existing && !isNewAccount ? "magiclink" : existing ? "recovery" : "invite";
  const firstJob = jobs[0].project_id;
  const next = isNewAccount ? "/set-password" : `/p/${firstJob}`;
  // Lands on a confirm page first, so mail scanners that pre-open links can't use it up.
  const link = `${site}/activate?token_hash=${encodeURIComponent(gen.properties.hashed_token)}&type=${linkType}&next=${encodeURIComponent(next)}`;

  if (inv.full_name) await admin.from("profiles").update({ full_name: inv.full_name }).eq("id", userId).eq("full_name", "");
  const { error: memErr } = await supabase.from("project_members").upsert(
    jobs.map((j) => ({ project_id: j.project_id, user_id: userId, member_role: j.member_role, access: j.access })));
  if (memErr) return { error: memErr.message };

  const label = (k: string) => SECTIONS.find((s) => s.key === (k as SectionKey))?.label ?? k;
  const ok = await emailActivation({
    fullName: inv.full_name || email, email, link, isNewAccount, note: inv.note ?? "",
    jobs: jobs.map((j) => {
      const p = j.projects as unknown as { name: string } | { name: string }[] | null;
      return { name: (Array.isArray(p) ? p[0]?.name : p?.name) ?? "Your project", role: TIERS[j.member_role as keyof typeof TIERS]?.label ?? "Client", sections: (j.access ?? []).map(label) };
    }),
  }).catch(() => false);

  await supabase.from("invites").update({ status: "sent", sent_at: new Date().toISOString(), user_id: userId, updated_at: new Date().toISOString() }).eq("id", inviteId);
  if (inv.request_id) await supabase.from("access_requests").update({ status: "done" }).eq("id", inv.request_id);
  for (const j of jobs) revalidatePath(`/p/${j.project_id}`, "layout");
  revalidatePath(`/invites/${inviteId}`); revalidatePath("/");
  return ok
    ? { ok: `Activated. ${email} has access and the activation link is on its way.` }
    : { error: "Access is set up, but the email didn't send. Use “Resend activation link”." };
}

export async function resendActivation(inviteId: string): Promise<R> {
  return activate(inviteId);
}

export async function cancelInvite(inviteId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("invites").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", inviteId).eq("status", "draft");
  revalidatePath("/");
  redirect("/");
}
