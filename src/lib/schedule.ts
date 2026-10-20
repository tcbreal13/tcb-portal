import type { JobRecord, Phase, ScheduleTask, TaskStatus } from "@/lib/types";

/* ---------- date helpers (all local-midnight, ISO yyyy-mm-dd in/out) ---------- */
export const DAY = 86_400_000;
export const toMs = (iso: string) => new Date(iso + "T00:00:00").getTime();
export const toISO = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const todayMs = () => toMs(toISO(Date.now()));
/** Mon–Fri working days between two ISO dates, inclusive. A same-day task is 1; a milestone stays 0 by the caller's choice. */
export function workDays(startISO: string, endISO: string): number {
  let n = 0;
  for (let t = toMs(startISO); t <= toMs(endISO); t += DAY) { const d = new Date(t).getDay(); if (d !== 0 && d !== 6) n++; }
  return n;
}
/** Add N working days to an ISO date (N=0 returns the same day). */
export function addWorkDays(startISO: string, n: number): string {
  let t = toMs(startISO), left = Math.max(0, n - 1);
  while (left > 0) { t += DAY; const d = new Date(t).getDay(); if (d !== 0 && d !== 6) left--; }
  return toISO(t);
}

/* ---------- grouping ---------- */
export interface PhaseGroup { phase: Phase | null; tasks: ScheduleTask[]; start: string; end: string; percent: number }

/** A zero-duration row is a milestone (NTP, "Foundation complete", a release gate). */
export function isMilestone(t: ScheduleTask) { return t.duration_days === 0; }

/** Tasks the viewer may see. Clients never see rows flagged hidden. */
export function visibleTasks(r: JobRecord, isBuilder: boolean) {
  return isBuilder ? r.tasks : r.tasks.filter((t) => t.show_client);
}

/** Group tasks under their phase, in phase order; tasks with no phase land in a trailing "Unassigned" group. */
export function groupByPhase(phases: Phase[], tasks: ScheduleTask[]): PhaseGroup[] {
  const groups: PhaseGroup[] = phases.map((p) => ({ phase: p, tasks: [], start: p.start_date, end: p.end_date, percent: p.percent_complete }));
  const loose: ScheduleTask[] = [];
  for (const t of tasks) { const g = groups.find((x) => x.phase?.id === t.phase_id); if (g) g.tasks.push(t); else loose.push(t); }
  if (loose.length) groups.push({ phase: null, tasks: loose, start: loose[0].start_date, end: loose[0].end_date, percent: 0 });
  for (const g of groups) {
    if (g.tasks.length) {
      g.start = g.tasks.reduce((m, t) => (t.start_date < m ? t.start_date : m), g.tasks[0].start_date);
      g.end = g.tasks.reduce((m, t) => (t.end_date > m ? t.end_date : m), g.tasks[0].end_date);
      g.percent = percentFromTasks(g.tasks) ?? g.percent;
    }
  }
  return groups.filter((g) => g.tasks.length || g.phase);
}

/** Duration-weighted completion from task statuses; null when there are no tasks. */
export function percentFromTasks(tasks: Pick<ScheduleTask, "duration_days" | "status">[]): number | null {
  if (!tasks.length) return null;
  const w = (t: Pick<ScheduleTask, "duration_days">) => Math.max(t.duration_days, 1);
  const total = tasks.reduce((s, t) => s + w(t), 0);
  const done = tasks.reduce((s, t) => s + (t.status === "complete" ? w(t) : t.status === "in_progress" ? w(t) / 2 : 0), 0);
  return Math.round((100 * done) / total);
}

export function scheduleRange(groups: PhaseGroup[]) {
  const all = groups.flatMap((g) => g.tasks);
  if (!all.length) { const t = todayMs(); return { t0: t, t1: t + 30 * DAY }; }
  const t0 = Math.min(...all.map((t) => toMs(t.start_date)));
  const t1 = Math.max(...all.map((t) => toMs(t.end_date)));
  return { t0, t1 };
}

/** Status label and tone for pills and the PDF legend. */
export function statusLabel(s: TaskStatus, endISO?: string): { label: string; tone: "good" | "info" | "idle" | "crit" } {
  if (s === "complete") return { label: "Complete", tone: "good" };
  if (s === "in_progress") return { label: "In progress", tone: "info" };
  if (endISO && toMs(endISO) < todayMs()) return { label: "Past due", tone: "crit" };
  return { label: "Upcoming", tone: "idle" };
}

/** Month bands and week ticks for a time axis. */
export function axisTicks(t0: number, t1: number) {
  const months: { start: number; end: number; label: string }[] = [];
  const d = new Date(t0); d.setDate(1);
  while (d.getTime() <= t1) {
    const s = d.getTime(); const n = new Date(d); n.setMonth(n.getMonth() + 1);
    months.push({ start: Math.max(s, t0), end: Math.min(n.getTime(), t1 + DAY), label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
    d.setMonth(d.getMonth() + 1);
  }
  const weeks: { at: number; label: string }[] = [];
  const w = new Date(t0); while (w.getDay() !== 1) w.setDate(w.getDate() + 1);
  for (; w.getTime() <= t1; w.setDate(w.getDate() + 7)) weeks.push({ at: w.getTime(), label: `${w.getMonth() + 1}/${w.getDate()}` });
  return { months, weeks };
}

/* ---------- CSV ---------- */
const csvCell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const csvLine = (cells: unknown[]) => cells.map(csvCell).join(",");

/** Buildertrend "Schedule Import" layout — the same columns Tim's template sheet uses, so it round-trips. */
export const BT_HEADERS = ["Title", "Start Date", "End Date", "Duration (Work Days)", "Phase", "Cost Code (SOV)", "Assigned To (Sub/Vendor)", "Predecessor Title", "Predecessor Type", "Lag (Days)", "Show on Client Portal", "Notes", "Status"] as const;

const usDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}/${y}`; };

export function buildertrendCsv(groups: PhaseGroup[]): string {
  const lines = [csvLine([...BT_HEADERS])];
  for (const g of groups) for (const t of g.tasks) {
    lines.push(csvLine([t.title, usDate(t.start_date), usDate(t.end_date), t.duration_days, g.phase ? `${g.phase.sort_order} - ${g.phase.name}` : "", t.cost_code, t.assigned_to, t.predecessors, t.predecessor_type, t.lag_days, t.show_client ? "Yes" : "No", t.notes, t.status]));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Client-friendly CSV: what the schedule page shows, nothing internal. */
export function clientCsv(projectName: string, groups: PhaseGroup[]): string {
  const lines = [csvLine(["Project", projectName]), csvLine(["Exported", usDate(toISO(Date.now()))]), "", csvLine(["Phase", "Task", "Start", "Finish", "Work days", "Milestone", "Who", "Status", "Notes"])];
  for (const g of groups) for (const t of g.tasks) {
    lines.push(csvLine([g.phase?.name ?? "Other", t.title, usDate(t.start_date), usDate(t.end_date), t.duration_days, isMilestone(t) ? "Yes" : "", t.assigned_to, statusLabel(t.status, t.end_date).label, t.notes]));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/* ---------- CSV import (Buildertrend layout or our export) ---------- */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Accepts 9/1/2026, 2026-09-01, 09/01/26. Returns ISO or null. */
export function parseDate(s: string): string | null {
  const v = s.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
  const d = new Date(v); return isNaN(d.getTime()) ? null : toISO(d.getTime());
}

export interface ImportedTask { title: string; start_date: string; end_date: string; duration_days: number; phase: string; cost_code: string; assigned_to: string; predecessors: string; predecessor_type: string; lag_days: string; show_client: boolean; notes: string; status: TaskStatus }

export function tasksFromCsv(text: string): { tasks: ImportedTask[]; errors: string[] } {
  const rows = parseCsv(text); const errors: string[] = []; const tasks: ImportedTask[] = [];
  if (!rows.length) return { tasks, errors: ["The file is empty."] };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => { for (const n of names) { const i = head.findIndex((h) => h === n.toLowerCase() || h.startsWith(n.toLowerCase())); if (i >= 0) return i; } return -1; };
  const iTitle = col("title", "task"), iStart = col("start date", "start"), iEnd = col("end date", "finish", "end"), iDur = col("duration"), iPhase = col("phase"), iCode = col("cost code"), iWho = col("assigned to", "who"), iPred = col("predecessor title", "predecessor"), iPT = col("predecessor type"), iLag = col("lag"), iShow = col("show on client portal", "show"), iNotes = col("notes"), iStatus = col("status");
  if (iTitle < 0 || iStart < 0 || iEnd < 0) return { tasks, errors: ["Need at least Title, Start Date and End Date columns (Buildertrend 'Schedule Import' layout)."] };
  rows.slice(1).forEach((r, n) => {
    const title = (r[iTitle] ?? "").trim(); if (!title) return;
    const s = parseDate(r[iStart] ?? ""), e = parseDate(r[iEnd] ?? "");
    if (!s || !e) { errors.push(`Row ${n + 2} (${title}): bad date.`); return; }
    const durRaw = iDur >= 0 ? Number(r[iDur]) : NaN;
    const statusRaw = (iStatus >= 0 ? r[iStatus] : "").trim().toLowerCase().replace(/\s+/g, "_");
    tasks.push({
      title, start_date: s, end_date: e < s ? s : e, duration_days: isNaN(durRaw) ? workDays(s, e) : Math.max(0, Math.round(durRaw)),
      phase: (iPhase >= 0 ? r[iPhase] : "").trim(), cost_code: (iCode >= 0 ? r[iCode] : "").trim(), assigned_to: (iWho >= 0 ? r[iWho] : "").trim(),
      predecessors: (iPred >= 0 ? r[iPred] : "").trim(), predecessor_type: (iPT >= 0 ? r[iPT] : "").trim(), lag_days: (iLag >= 0 ? r[iLag] : "").trim(),
      show_client: iShow < 0 ? true : !/^(no|n|false|0)$/i.test((r[iShow] ?? "yes").trim()),
      notes: (iNotes >= 0 ? r[iNotes] : "").trim(),
      status: statusRaw === "complete" || statusRaw === "completed" || statusRaw === "done" ? "complete" : statusRaw === "in_progress" || statusRaw === "started" ? "in_progress" : "planned",
    });
  });
  return { tasks, errors };
}
