import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DAY, axisTicks, isMilestone, scheduleRange, todayMs, toMs, type PhaseGroup } from "@/lib/schedule";
import { logoPng } from "@/lib/insurance-export";
import type { PDFImage } from "pdf-lib";

/* Brand colours (print on white, same as the portal's light theme) */
const INK = rgb(0.14, 0.14, 0.14), MUTED = rgb(0.42, 0.42, 0.42), LINE = rgb(0.85, 0.85, 0.85), SUNK = rgb(0.945, 0.945, 0.945);
const YELLOW = rgb(1, 0.89, 0.06), GOOD = rgb(0.12, 0.42, 0.27), CRIT = rgb(0.66, 0.2, 0.16), WHITE = rgb(1, 1, 1);

/** Standard fonts only know WinAnsi; swap anything else so encoding never throws. */
const clean = (s: string) => s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
const us = (iso: string) => { const [y, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}/${y.slice(2)}`; };

function fit(font: PDFFont, text: string, size: number, maxW: number) {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "...", size) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "...";
}

export interface GanttPdfInput {
  projectName: string; address: string; clients: string; targetCompletion: string | null; scheduleStatus: string; scheduleNote: string;
  groups: PhaseGroup[]; forBuilder: boolean;
}

/** Landscape-letter Gantt: task list on the left, time scale on the right, paged as needed. */
export async function buildGanttPdf(input: GanttPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.projectName} - Construction schedule`);
  doc.setAuthor("TCB Consult LLC / TCB Development Ltd.");
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const LOGO = await doc.embedPng(await logoPng());

  const PW = 792, PH = 612, M = 36;
  const COLS = { task: 236, start: 42, end: 42, days: 28, who: 92 };
  const LAB = COLS.task + COLS.start + COLS.end + COLS.days + COLS.who;
  const chartX0 = M + LAB + 8, chartW = PW - M - chartX0;
  const HEAD_H = 92, AXIS_H = 30, ROW = 14, PHROW = 17, FOOT = 8;

  const rows: { kind: "phase" | "task"; g: PhaseGroup; t?: PhaseGroup["tasks"][number] }[] = [];
  for (const g of input.groups) { rows.push({ kind: "phase", g }); for (const t of g.tasks) rows.push({ kind: "task", g, t }); }
  const { t0: s0, t1: e0 } = scheduleRange(input.groups);
  const t0 = s0 - 2 * DAY, t1 = e0 + 4 * DAY, span = Math.max(t1 - t0, DAY);
  const x = (ms: number) => chartX0 + ((ms - t0) / span) * chartW;
  const { months, weeks } = axisTicks(t0, t1);
  const now = todayMs();
  const all = rows.filter((r) => r.kind === "task").map((r) => r.t!);
  const done = all.filter((t) => t.status === "complete").length;

  // paginate
  const pages: typeof rows[] = []; let cur: typeof rows = []; let h = 0;
  const avail = PH - M - HEAD_H - AXIS_H - FOOT - M;
  for (const r of rows) { const rh = r.kind === "phase" ? PHROW : ROW; if (h + rh > avail && cur.length) { pages.push(cur); cur = []; h = 0; } cur.push(r); h += rh; }
  if (cur.length || !pages.length) pages.push(cur);

  pages.forEach((prows, pi) => {
    const page = doc.addPage([PW, PH]);
    drawHeader(page, F, B, input, { pi, n: pages.length, done, total: all.length, M, PW, PH, logo: LOGO });
    const top = PH - M - HEAD_H; // y of axis top
    // axis
    months.forEach((m, i) => {
      const mx = x(m.start), mw = x(m.end) - mx;
      if (i % 2) page.drawRectangle({ x: mx, y: top - AXIS_H, width: mw, height: AXIS_H, color: SUNK });
      if (mw > 30) page.drawText(clean(m.label), { x: mx + 3, y: top - 11, size: 8, font: B, color: INK });
    });
    weeks.forEach((w) => { const wx = x(w.at); if (chartW / weeks.length > 18) page.drawText(w.label, { x: wx + 1.5, y: top - AXIS_H + 4, size: 6, font: F, color: MUTED }); });
    // column heads
    const hy = top - AXIS_H + 5; let cx = M;
    const heads: [string, number, boolean][] = [["Task", COLS.task, false], ["Start", COLS.start, false], ["Finish", COLS.end, false], ["Days", COLS.days, true], ["Who", COLS.who, false]];
    for (const [label, w, right] of heads) { page.drawText(label, { x: right ? cx + w - B.widthOfTextAtSize(label, 7.5) - 2 : cx + 2, y: hy, size: 7.5, font: B, color: MUTED }); cx += w; }
    page.drawLine({ start: { x: M, y: top - AXIS_H }, end: { x: PW - M, y: top - AXIS_H }, thickness: 0.8, color: INK });

    // body background: weekends + week lines
    let y = top - AXIS_H;
    const bodyH = prows.reduce((s, r) => s + (r.kind === "phase" ? PHROW : ROW), 0);
    for (let d = t0; d <= t1; d += DAY) { const wd = new Date(d).getDay(); if (wd === 0 || wd === 6) page.drawRectangle({ x: x(d), y: y - bodyH, width: x(d + DAY) - x(d), height: bodyH, color: rgb(0.965, 0.965, 0.965) }); }
    weeks.forEach((w) => page.drawLine({ start: { x: x(w.at), y }, end: { x: x(w.at), y: y - bodyH }, thickness: 0.3, color: LINE, dashArray: [1, 2] }));

    for (const r of prows) {
      if (r.kind === "phase") {
        y -= PHROW;
        page.drawRectangle({ x: M, y, width: PW - 2 * M, height: PHROW, color: SUNK });
        page.drawText(fit(B, (r.g.phase?.name ?? "Other").toUpperCase(), 8, LAB - 40), { x: M + 2, y: y + 5, size: 8, font: B, color: INK });
        const pct = `${r.g.percent}%`; page.drawText(pct, { x: M + LAB - B.widthOfTextAtSize(pct, 7.5) - 2, y: y + 5, size: 7.5, font: B, color: MUTED });
        const gs = x(toMs(r.g.start)), ge = x(toMs(r.g.end) + DAY);
        page.drawRectangle({ x: gs, y: y + 6, width: Math.max(ge - gs, 1.5), height: 5, color: INK });
        if (r.g.percent > 0) page.drawRectangle({ x: gs, y: y + 6, width: Math.max((ge - gs) * r.g.percent / 100, 0.5), height: 5, color: YELLOW });
        continue;
      }
      const t = r.t!; y -= ROW;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.3, color: LINE });
      const ty = y + 4; let cx2 = M;
      const ms = isMilestone(t);
      const title = (t.show_client ? "" : "[hidden] ") + t.title;
      page.drawText(fit(F, title, 7.5, COLS.task - 12), { x: cx2 + (ms ? 10 : 10), y: ty, size: 7.5, font: F, color: t.show_client ? INK : MUTED });
      if (ms) drawDiamond(page, cx2 + 5, y + ROW / 2, 2.6, INK);
      cx2 += COLS.task;
      page.drawText(us(t.start_date), { x: cx2 + 2, y: ty, size: 7.5, font: F, color: INK }); cx2 += COLS.start;
      page.drawText(us(t.end_date), { x: cx2 + 2, y: ty, size: 7.5, font: F, color: INK }); cx2 += COLS.end;
      const dd = ms ? "-" : String(t.duration_days); page.drawText(dd, { x: cx2 + COLS.days - F.widthOfTextAtSize(dd, 7.5) - 2, y: ty, size: 7.5, font: F, color: INK }); cx2 += COLS.days;
      page.drawText(fit(F, t.assigned_to, 7, COLS.who - 4), { x: cx2 + 2, y: ty, size: 7, font: F, color: MUTED });
      // bar
      const bs = x(toMs(t.start_date)), be = x(toMs(t.end_date) + DAY), cy = y + ROW / 2;
      if (ms) drawDiamond(page, bs, cy, 4, t.status === "complete" ? GOOD : INK);
      else {
        const late = t.status !== "complete" && toMs(t.end_date) < now;
        const fill = t.status === "complete" ? GOOD : t.status === "in_progress" ? YELLOW : late ? CRIT : WHITE;
        page.drawRectangle({ x: bs, y: cy - 4, width: Math.max(be - bs, 2), height: 8, color: fill, borderColor: t.status === "complete" ? GOOD : INK, borderWidth: 0.6 });
        if (t.status === "in_progress") page.drawRectangle({ x: bs, y: cy - 4, width: Math.max((be - bs) / 2, 1), height: 8, color: rgb(0.14, 0.14, 0.14), opacity: 0.25 });
      }
    }
    // today line
    if (now >= t0 && now <= t1) {
      page.drawLine({ start: { x: x(now), y: top - AXIS_H + 2 }, end: { x: x(now), y: y - 2 }, thickness: 1, color: CRIT });
      page.drawText("TODAY", { x: x(now) + 2, y: top - AXIS_H + 2, size: 5.5, font: B, color: CRIT });
    }
    drawFooter(page, F, B, { M, PW, pi, n: pages.length, forBuilder: input.forBuilder });
  });

  return doc.save();
}

function drawDiamond(page: PDFPage, cx: number, cy: number, r: number, color: ReturnType<typeof rgb>) {
  const s = r * Math.SQRT2;
  page.drawRectangle({ x: cx, y: cy - r, width: s, height: s, rotate: degrees(45), color });
}

function drawHeader(page: PDFPage, F: PDFFont, B: PDFFont, input: GanttPdfInput, o: { pi: number; n: number; done: number; total: number; M: number; PW: number; PH: number; logo?: PDFImage }) {
  const { M, PW, PH } = o; const top = PH - M;
  page.drawRectangle({ x: M, y: top - 3, width: PW - 2 * M, height: 3, color: YELLOW });
  if (o.logo) { const w = 88, h = w * (o.logo.height / o.logo.width); page.drawImage(o.logo, { x: M, y: top - 8 - h, width: w, height: h }); }
  else { page.drawText("TCB", { x: M, y: top - 26, size: 22, font: B, color: INK }); page.drawText("DEVELOPMENT LTD.  ·  CLIENT PORTAL", { x: M, y: top - 36, size: 6.5, font: F, color: MUTED }); }
  page.drawText("CONSTRUCTION SCHEDULE", { x: M, y: top - 56, size: 13, font: B, color: INK });
  page.drawText(clean(`${input.projectName}${input.address ? " - " + input.address : ""}`), { x: M, y: top - 69, size: 9, font: F, color: INK });
  if (input.clients) page.drawText(clean(`Prepared for ${input.clients}`), { x: M, y: top - 80, size: 8, font: F, color: MUTED });
  const right = (txt: string, y: number, size: number, font: PDFFont, color = INK) => page.drawText(clean(txt), { x: PW - M - font.widthOfTextAtSize(clean(txt), size), y, size, font, color });
  right(`Issued ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, top - 26, 8.5, F);
  if (input.targetCompletion) right(`Target completion ${new Date(input.targetCompletion + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, top - 38, 8.5, B);
  right(`${o.done} of ${o.total} tasks complete${input.scheduleStatus ? "  ·  " + input.scheduleStatus : ""}`, top - 50, 8.5, F);
  if (input.scheduleNote) right(input.scheduleNote, top - 62, 8, F, MUTED);
  // legend
  let lx = PW - M - 232; const ly = top - 82;
  const item = (label: string, draw: () => void) => { draw(); page.drawText(label, { x: lx + 14, y: ly, size: 7, font: F, color: MUTED }); lx += 14 + F.widthOfTextAtSize(label, 7) + 12; };
  item("Complete", () => page.drawRectangle({ x: lx, y: ly - 1, width: 10, height: 7, color: GOOD }));
  item("In progress", () => page.drawRectangle({ x: lx, y: ly - 1, width: 10, height: 7, color: YELLOW, borderColor: INK, borderWidth: 0.5 }));
  item("Upcoming", () => page.drawRectangle({ x: lx, y: ly - 1, width: 10, height: 7, color: WHITE, borderColor: INK, borderWidth: 0.5 }));
  item("Milestone", () => drawDiamond(page, lx + 5, ly + 2.5, 3.5, INK));
}

function drawFooter(page: PDFPage, F: PDFFont, B: PDFFont, o: { M: number; PW: number; pi: number; n: number; forBuilder: boolean }) {
  const y = o.M - 14;
  page.drawLine({ start: { x: o.M, y: y + 10 }, end: { x: o.PW - o.M, y: y + 10 }, thickness: 0.5, color: LINE });
  page.drawText("TCB Consult LLC / TCB Development Ltd.  ·  CSLB Lic # 1093014  ·  tim@tcbreal.com  ·  (310) 984-6621", { x: o.M, y, size: 6.5, font: F, color: MUTED });
  const note = o.forBuilder ? "Builder copy - includes rows hidden from the client." : "Working days Mon-Fri. Dates are the current plan and move with weather, inspections and selections.";
  page.drawText(note, { x: o.M, y: y - 8, size: 6.5, font: F, color: MUTED });
  const pg = `Page ${o.pi + 1} of ${o.n}`; page.drawText(pg, { x: o.PW - o.M - B.widthOfTextAtSize(pg, 7), y, size: 7, font: B, color: INK });
}
