import type { SupabaseClient } from "@supabase/supabase-js";

/** The standard agency tracks on every pre-development job. Order = display order. */
export const AGENCIES = [
  { key: "coastal", label: "California Coastal Commission", short: "Coastal Commission", hint: "coastal.ca.gov — Coastal Development Permit (CDP), exemption, waiver" },
  { key: "mello", label: "Mello Act", short: "Mello Act", hint: "Mello Act compliance determination in the Coastal Zone (LA City Housing / Planning)" },
  { key: "sb9", label: "SB 9", short: "SB 9", hint: "SB 9 urban lot split / two-unit development (LA City Planning)" },
  { key: "lacounty", label: "LA County Building & Safety", short: "LA County B&S", hint: "dpw.lacounty.gov / LA County Public Works — Building & Safety" },
  { key: "ladbs", label: "LADBS", short: "LADBS", hint: "ladbs.org / lacity.org — LA City Department of Building and Safety plan check & permits" },
] as const;
export type AgencyKey = (typeof AGENCIES)[number]["key"];

export const PREDEV_STATUSES = [
  ["not_started", "Not started", "idle"],
  ["preparing", "Preparing submittal", "info"],
  ["submitted", "Submitted", "info"],
  ["in_review", "In review", "info"],
  ["corrections", "Corrections requested", "warn"],
  ["approved", "Approved", "good"],
  ["not_required", "Not required", "idle"],
] as const;
export type PredevStatus = (typeof PREDEV_STATUSES)[number][0];
export const statusInfo = (s: string) => PREDEV_STATUSES.find((x) => x[0] === s) ?? PREDEV_STATUSES[0];

export interface Track {
  id: string | null; project_id: string; agency: string; label: string; applies: boolean | null; status: string;
  contact_name: string; contact_email: string; contact_phone: string; case_number: string;
  submitted_date: string | null; est_completion: string | null; notes: string; sort_order: number;
}
export interface Fee { id: string; track_id: string; description: string; requested_amount: number | null; requested_date: string | null; paid_amount: number | null; paid_date: string | null }
export interface Activity {
  id: string; track_id: string | null; activity_date: string; summary: string; source: string; state: string;
  email_from: string; email_subject: string; proposed: Proposed; created_at: string;
}
/** What Claude may propose from an email. Applied to the track only when Tim accepts. */
export interface Proposed {
  status?: string; submitted_date?: string; est_completion?: string; case_number?: string;
  contact?: { name?: string; email?: string; phone?: string };
  fee_requested?: { description?: string; amount?: number; date?: string };
  fee_paid?: { description?: string; amount?: number; date?: string };
}

/** Every agency track for a job, filling in unsaved defaults so the page always shows all five. */
export async function loadPredev(supabase: SupabaseClient, projectId: string) {
  const [{ data: tracks }, { data: fees }, { data: acts }] = await Promise.all([
    supabase.from("predev_tracks").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("predev_fees").select("*").eq("project_id", projectId).order("requested_date", { nullsFirst: false }),
    supabase.from("predev_activity").select("*").eq("project_id", projectId).neq("state", "rejected").order("activity_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const saved = (tracks ?? []) as Track[];
  const list: Track[] = AGENCIES.map((a, i) => saved.find((t) => t.agency === a.key) ?? {
    id: null, project_id: projectId, agency: a.key, label: a.label, applies: null, status: "not_started",
    contact_name: "", contact_email: "", contact_phone: "", case_number: "", submitted_date: null, est_completion: null, notes: "", sort_order: i,
  });
  for (const t of saved) if (!AGENCIES.some((a) => a.key === t.agency)) list.push(t);
  return { tracks: list, fees: (fees ?? []) as Fee[], activity: (acts ?? []) as Activity[] };
}

export const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }));
