import crypto from "node:crypto";
import { anthropic, MODEL } from "@/lib/claude";
import { AGENCIES, PREDEV_STATUSES, type Proposed } from "@/lib/predev";

/* ---------- Resend (Svix) webhook signature ---------- */
/** Verifies svix-id / svix-timestamp / svix-signature against the raw body. Secret is the "whsec_…" value from Resend. */
export function verifyWebhook(raw: string, h: Headers, secret: string): boolean {
  const id = h.get("svix-id"), ts = h.get("svix-timestamp"), sig = h.get("svix-signature");
  if (!id || !ts || !sig || !secret) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return sig.split(" ").some((part) => {
    const [, v] = part.split(",");
    if (!v) return false;
    const a = Buffer.from(v), b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

/* ---------- body helpers ---------- */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}

/* ---------- Claude extraction ---------- */
export interface ProjectHint { id: string; name: string; address: string; contacts: string[]; cases: string[] }
export interface Extracted {
  project_id: string | null; agency: string | null; activity_date: string | null;
  summary: string; proposed: Proposed; relevant: boolean;
}

const SYSTEM = `You file emails for TCB Development, a Los Angeles residential builder, into its pre-development tracker.
Each job may have these agency tracks: ${AGENCIES.map((a) => `"${a.key}" = ${a.label} (${a.hint})`).join("; ")}.
Statuses: ${PREDEV_STATUSES.map((s) => `"${s[0]}" (${s[1]})`).join(", ")}.

Given one email (often forwarded by Tim, so the real sender may be inside the body) and the list of jobs, return ONLY a JSON object:
{"relevant": boolean,            // false if this has nothing to do with permits/entitlements/agency approvals
 "project_id": string|null,      // id from the job list, matched by street address, job name, case number or contact; null if unsure
 "agency": string|null,          // one of the agency keys above, null if unsure
 "activity_date": "YYYY-MM-DD"|null, // date the agency action happened (the email's date if nothing more specific)
 "summary": string,              // one or two plain sentences for a client-facing timeline, e.g. "Coastal Commission requested a $4,850 CDP filing fee, due Nov 15." No greetings, no email boilerplate.
 "proposed": {                   // only include keys the email actually supports
   "status": string, "submitted_date": "YYYY-MM-DD", "est_completion": "YYYY-MM-DD", "case_number": string,
   "contact": {"name": string, "email": string, "phone": string},
   "fee_requested": {"description": string, "amount": number, "date": "YYYY-MM-DD"},
   "fee_paid": {"description": string, "amount": number, "date": "YYYY-MM-DD"}
 }}
Never invent amounts, dates or case numbers. If the agency asks for a fee, that is fee_requested; a receipt or payment confirmation is fee_paid. Contact = the agency person handling the file (not Tim).`;

export async function extractFromEmail(e: { from: string; subject: string; date: string; body: string }, projects: ProjectHint[]): Promise<Extracted> {
  const jobs = projects.map((p) => `- id=${p.id} | ${p.name} | ${p.address}${p.cases.length ? ` | case #s: ${p.cases.join(", ")}` : ""}${p.contacts.length ? ` | agency contacts: ${p.contacts.join(", ")}` : ""}`).join("\n");
  const msg = await anthropic().messages.create({
    model: MODEL, max_tokens: 900, system: SYSTEM,
    messages: [{ role: "user", content: `JOBS:\n${jobs}\n\nEMAIL\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\n\n${e.body.slice(0, 14000)}` }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let out: Partial<Extracted> = {};
  try { out = JSON.parse(json); } catch { /* fall through to a safe default */ }
  const ids = new Set(projects.map((p) => p.id));
  const agencyKeys = new Set(AGENCIES.map((a) => a.key as string));
  return {
    relevant: out.relevant !== false,
    project_id: out.project_id && ids.has(out.project_id) ? out.project_id : null,
    agency: out.agency && agencyKeys.has(out.agency) ? out.agency : null,
    activity_date: typeof out.activity_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.activity_date) ? out.activity_date : null,
    summary: (out.summary || e.subject || "Email received").slice(0, 600),
    proposed: (out.proposed && typeof out.proposed === "object" ? out.proposed : {}) as Proposed,
  };
}
