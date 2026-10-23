import { cache } from "react";
import { normalizeFolder } from "@/lib/doc-folders";
import { ALL_SECTIONS, TIERS, firstAllowedPath, isTier, type SectionKey, type Tier } from "@/lib/access";
import { cookies } from "next/headers";

/** Cookie Tim sets with "View as": the portal then renders as that role would see it. Builders only. */
export const VIEW_AS_COOKIE = "tcb_view_as";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { JobRecord, Profile, Project, Selection, DailyLog, Message, ScheduleTask, InsuranceClaim, InsuranceLine } from "@/lib/types";

/** Signed-in user plus profile. Redirects to /login when signed out. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  const real = (profile ?? { id: user.id, full_name: user.email ?? "", role: "client" }) as Profile;
  // "View as" preview: a builder sees the portal exactly as that role would. Writes are blocked while previewing.
  // Cookie is "tier" or "tier~section,section~/return/path" (the exact set from an invite under review).
  const [v, secs, back] = ((await cookies()).get(VIEW_AS_COOKIE)?.value ?? "").split("~");
  const viewAs: Tier | null = real.role === "builder" && isTier(v) ? v : null;
  const viewAsSections: string[] | null = viewAs && secs !== undefined ? secs.split(",").filter((k) => (ALL_SECTIONS as string[]).includes(k)) : null;
  const viewAsBack = viewAs && back?.startsWith("/") ? back : null;
  return { user, profile: viewAs ? { ...real, role: "client" as const } : real, realRole: real.role, viewAs, viewAsSections, viewAsBack, supabase };
});

export async function listProjects(): Promise<Project[]> {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("projects").select("*").eq("archived", false).order("name");
  return (data ?? []) as Project[];
}

/** Everything about one job, in one shot. RLS guarantees the viewer may see it. */
export const getJobRecord = cache(async (projectId: string): Promise<JobRecord | null> => {
  const { supabase, user, profile } = await getViewer();
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;

  const [phases, tasks, lookahead, logs, photos, budget, payApps, changeOrders, selections, options, docs, messages, updates, members, insurance, insuranceLines] = await Promise.all([
    supabase.from("phases").select("*").eq("project_id", projectId).order("sort_order").order("start_date"),
    supabase.from("schedule_tasks").select("*").eq("project_id", projectId).order("sort_order").order("start_date"),
    supabase.from("lookahead_items").select("*").eq("project_id", projectId).order("item_date"),
    supabase.from("daily_logs").select("*").eq("project_id", projectId).order("log_date", { ascending: false }).limit(60),
    supabase.from("log_photos").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("budget_lines").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("pay_apps").select("*").eq("project_id", projectId).order("number"),
    supabase.from("change_orders").select("*").eq("project_id", projectId).order("sent_date").order("code"),
    supabase.from("selections").select("*").eq("project_id", projectId).order("needed_by", { nullsFirst: false }),
    supabase.from("selection_options").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("documents").select("*").eq("project_id", projectId).order("doc_date", { ascending: false }),
    supabase.from("messages").select("id, sender_id, body, created_at, profiles(full_name)").eq("project_id", projectId).order("created_at").limit(300),
    supabase.from("updates").select("*").eq("project_id", projectId).order("update_date", { ascending: false }).limit(20),
    supabase.from("project_members").select("user_id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("insurance_claims").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("insurance_lines").select("*").eq("project_id", projectId).order("section").order("sort_order"),
  ]);
  let access: string[] = ALL_SECTIONS, tier = "builder";
  const { viewAs, viewAsSections } = await getViewer();
  if (viewAs) { access = viewAsSections ?? [...TIERS[viewAs].sections]; tier = viewAs; }
  else if (profile.role !== "builder") {
    const { data: me } = await supabase.from("project_members").select("access, member_role").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
    access = (me?.access as string[] | undefined) ?? [];
    tier = me?.member_role ?? "client";
  }

  // Signed URLs for photos (private bucket). One batch call.
  const photoRows = photos.data ?? [];
  let urlByPath = new Map<string, string>();
  if (photoRows.length) {
    const { data: signed } = await supabase.storage.from("photos").createSignedUrls(photoRows.map((p) => p.storage_path), 3600);
    urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  }
  const logsWithPhotos: DailyLog[] = (logs.data ?? []).map((l) => ({
    ...l,
    photos: photoRows.filter((p) => p.log_id === l.id).map((p) => ({ ...p, url: urlByPath.get(p.storage_path) })),
  }));

  const sels: Selection[] = (selections.data ?? []).map((s) => ({
    ...s,
    options: (options.data ?? []).filter((o) => o.selection_id === s.id),
  }));

  const msgs: Message[] = (messages.data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string } | { full_name: string }[] | null;
    const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
    return { id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at, sender_name: name ?? "" };
  });

  return {
    project: project as Project,
    phases: phases.data ?? [],
    tasks: (tasks.data ?? []) as ScheduleTask[],
    lookahead: lookahead.data ?? [],
    logs: logsWithPhotos,
    budget: budget.data ?? [],
    payApps: payApps.data ?? [],
    changeOrders: changeOrders.data ?? [],
    insurance: (insurance.data as InsuranceClaim | null) ?? null,
    insuranceLines: (insuranceLines.data ?? []) as InsuranceLine[],
    selections: sels,
    docs: docs.data ?? [],
    messages: msgs,
    updates: updates.data ?? [],
    members: members.count ?? 0,
    viewerId: user.id,
    access,
    tier,
  };
});

/* ---- derived figures used by several pages and by Claude ---- */
export function approvedTotal(r: JobRecord) {
  return r.changeOrders.filter((c) => c.status === "approved").reduce((t, c) => t + Number(c.amount), 0);
}
export function pendingCos(r: JobRecord) { return r.changeOrders.filter((c) => c.status === "pending"); }
export function openSelections(r: JobRecord) { return r.selections.filter((s) => !s.chosen_option_id); }
export function billedTotal(r: JobRecord) { return r.budget.reduce((t, b) => t + Number(b.billed), 0); }
export function revisedContract(r: JobRecord) { return Number(r.project.contract_amount) + approvedTotal(r); }
export function paidCoTotal(r: JobRecord) {
  return r.changeOrders.filter((c) => c.status === "approved" && c.paid_date).reduce((t, c) => t + Number(c.amount), 0);
}
/** Carrier vs. TCB totals: by-trade subtotal, same-scope total (trades + add-ons), and the all-in TCB figure with scope gaps. */
export function insuranceTotals(r: JobRecord) {
  const by = (s: string, k: "carrier_amount" | "tcb_amount") => r.insuranceLines.filter((l) => l.section === s).reduce((t, l) => t + Number(l[k]), 0);
  const trades = { carrier: by("trade", "carrier_amount"), tcb: by("trade", "tcb_amount") };
  const addons = { carrier: by("addon", "carrier_amount"), tcb: by("addon", "tcb_amount") };
  const gaps = { carrier: by("gap", "carrier_amount"), tcb: by("gap", "tcb_amount") };
  const sameScope = { carrier: trades.carrier + addons.carrier, tcb: trades.tcb + addons.tcb };
  const allIn = { carrier: sameScope.carrier + gaps.carrier, tcb: sameScope.tcb + gaps.tcb };
  const limits = (r.insurance?.limits ?? []).reduce((t, l) => t + Number(l.amount), 0);
  return { trades, addons, gaps, sameScope, allIn, limits };
}
export function duePayApps(r: JobRecord) { return r.payApps.filter((p) => p.status === "due"); }

/** Plain-JSON version of the job record for Claude prompts. Photos and storage paths are left out. */
export function recordForClaude(r: JobRecord) {
  return {
    today: new Date().toISOString().slice(0, 10),
    project: {
      name: r.project.name, address: r.project.address, clients: r.project.client_names, description: r.project.description,
      currentPhase: r.project.current_phase, scheduleStatus: r.project.schedule_status, scheduleNote: r.project.schedule_note,
      originalContract: Number(r.project.contract_amount), targetCompletion: r.project.target_completion, budgetNote: r.project.budget_note,
    },
    approvedChangeOrdersTotal: approvedTotal(r),
    revisedContract: revisedContract(r),
    billedToDate: billedTotal(r),
    remainingToBill: revisedContract(r) - billedTotal(r),
    phases: r.phases.map((p) => ({ phase: p.name, start: p.start_date, finish: p.end_date, percentComplete: p.percent_complete })),
    scheduleTasks: r.tasks.filter((t) => t.show_client).map((t) => ({ phase: r.phases.find((p) => p.id === t.phase_id)?.name ?? "", task: t.title, start: t.start_date, finish: t.end_date, workDays: t.duration_days, who: t.assigned_to, status: t.status, milestone: t.duration_days === 0, note: t.notes })),
    lookAhead: r.lookahead.map((l) => ({ date: l.item_date, item: l.body })),
    dailyLogs: r.logs.slice(0, 20).map((l) => ({ date: l.log_date, weather: l.weather, crew: l.crew, note: l.note, photoCount: l.photos.length })),
    budget: r.budget.map((b) => ({ category: b.category, budget: Number(b.budget), billed: Number(b.billed) })),
    payApplications: r.payApps.map((p) => ({ number: p.number, periodEnding: p.period_ending, amount: Number(p.amount), status: p.status, statusDate: p.status_date, note: p.waiver_note, documentsOnPortal: [p.invoice_path && "pay app package (invoice, G702/G703, conditional waiver)", p.unconditional_waiver_path && "unconditional waiver"].filter(Boolean) })),
    changeOrders: r.changeOrders.map((c) => ({ id: c.code, title: c.title, amount: Number(c.amount), status: c.status, sent: c.sent_date, decided: c.decided_date, paid: c.paid_date, description: c.description })),
    insuranceComparison: r.insurance && r.access.includes("insurance") ? {
      carrier: r.insurance.carrier, claimNumber: r.insurance.claim_number, dateOfLoss: r.insurance.date_of_loss, estimateDate: r.insurance.estimate_date,
      policyLimits: r.insurance.limits, settlement: r.insurance.settlement,
      lines: r.insuranceLines.map((l) => ({ section: l.section, category: l.category, carrier: Number(l.carrier_amount), tcb: Number(l.tcb_amount), note: l.note })),
      totals: insuranceTotals(r),
    } : null,
    selections: r.selections.map((s) => ({
      item: s.item, neededBy: s.needed_by,
      chosen: s.options.find((o) => o.id === s.chosen_option_id)?.name ?? null,
      options: s.options.map((o) => ({ name: o.name, priceVsAllowance: Number(o.price_delta) })),
    })),
    documents: r.docs.map((d) => ({ title: d.title, folder: normalizeFolder(d.category), date: d.doc_date })),
    latestUpdates: r.updates.slice(0, 3).map((u) => ({ date: u.update_date, text: u.body })),
  };
}

/** Page guard for client sections: sends the viewer to the first section they may see. */
export async function requireSection(projectId: string, key: SectionKey): Promise<JobRecord> {
  const r = await getJobRecord(projectId);
  if (!r) notFound();
  if (!r.access.includes(key)) redirect(firstAllowedPath(`/p/${projectId}`, r.access));
  return r;
}
