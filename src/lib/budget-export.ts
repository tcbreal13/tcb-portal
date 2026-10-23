import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { logoPng } from "@/lib/insurance-export";
import type { BudgetLine, ChangeOrder, PayApp, Project } from "@/lib/types";

export interface BudgetExportInput {
  project: Project; budget: BudgetLine[]; payApps: PayApp[]; changeOrders: ChangeOrder[];
  totals: { original: number; approvedCos: number; revised: number; billed: number; budgetTotal: number };
}

const FOOTER = "TCB Consult LLC / TCB Development Ltd. · CSLB Lic # 1093014 · tim@tcbreal.com · (310) 984-6621 · www.tcbreal.com";
const issued = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const us = (iso: string | null) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}/${y}`; };
const pct = (b: number, n: number) => (b > 0 ? Math.round((n / b) * 100) : 0);

export function budgetFileStem(p: Project) {
  return `${p.name.replace(/[^A-Za-z0-9]+/g, "-")}-budget-${new Date().toISOString().slice(0, 10)}`;
}

/* ---------------- CSV ---------------- */
export function buildBudgetCsv({ project, budget, payApps, changeOrders, totals }: BudgetExportInput): string {
  const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const row = (...c: (string | number)[]) => c.map(esc).join(",");
  const out = [
    row("TCB Consult LLC / TCB Development Ltd. — Budget & billing"),
    row(`${project.name}${project.address ? " — " + project.address : ""}`),
    row(`Prepared for ${project.client_names}`, `Issued ${issued()}`),
    "",
  ];
  if (project.budget_note) { out.push(row("Scope basis")); for (const l of project.budget_note.split("\n")) out.push(row("", l)); out.push(""); }
  out.push(row("Summary"), row("", "Original contract", totals.original.toFixed(2)), row("", "Approved change orders", totals.approvedCos.toFixed(2)), row("", "Revised contract", totals.revised.toFixed(2)), row("", "Billed to date", totals.billed.toFixed(2)), row("", "Remaining to bill", (totals.revised - totals.billed).toFixed(2)), "");
  out.push(row("Budget by category"), row("Category", "Budget", "Billed", "Remaining", "Billed %"));
  for (const b of budget) out.push(row(b.category, Number(b.budget).toFixed(2), Number(b.billed).toFixed(2), (Number(b.budget) - Number(b.billed)).toFixed(2), pct(Number(b.budget), Number(b.billed))));
  out.push(row("Total", totals.budgetTotal.toFixed(2), totals.billed.toFixed(2), (totals.budgetTotal - totals.billed).toFixed(2), pct(totals.budgetTotal, totals.billed)), "");
  if (payApps.length) {
    out.push(row("Pay applications"), row("No.", "Period ending", "Amount", "Status", "Status date", "Note"));
    for (const p of payApps) out.push(row(p.number, p.period_ending, Number(p.amount).toFixed(2), p.status, p.status_date ?? "", p.waiver_note));
    out.push("");
  }
  const approved = changeOrders.filter((c) => c.status === "approved");
  if (approved.length) {
    out.push(row("Approved change orders"), row("Code", "Title", "Amount", "Approved", "Paid"));
    for (const c of approved) out.push(row(c.code, c.title, Number(c.amount).toFixed(2), c.decided_date ?? "", c.paid_date ?? ""));
    out.push("");
  }
  out.push(row(FOOTER));
  return "﻿" + out.join("\r\n") + "\r\n";
}

/* ---------------- Excel ---------------- */
export async function buildBudgetXlsx({ project, budget, payApps, changeOrders, totals }: BudgetExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); wb.creator = "TCB Consult LLC / TCB Development Ltd.";
  const ws = wb.addWorksheet("Budget", { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 52 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 11 }, { width: 40 }];
  const INK = "FF242424", MUTED = "FF6B6B6B", LINE = "FFD9D9D9", SUNK = "FFF1F1F1", YELLOW = "FFFFE30F";
  const money = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
  const logo = wb.addImage({ buffer: (await logoPng()) as unknown as ExcelJS.Buffer, extension: "png" });
  for (let i = 1; i <= 4; i++) ws.getRow(i).height = 19;
  ws.addImage(logo, { tl: { nativeCol: 0, nativeColOff: 0, nativeRow: 0, nativeRowOff: 38100 }, br: { nativeCol: 0, nativeColOff: 1463040, nativeRow: 2, nativeRowOff: 150495 }, editAs: "twoCell" } as never);
  const put = (r: number, c: number, v: ExcelJS.CellValue, o: { b?: boolean; size?: number; color?: string; fmt?: string; align?: "left" | "right"; fill?: string; wrap?: boolean } = {}) => {
    const cell = ws.getCell(r, c); cell.value = v;
    cell.font = { name: "Arial", size: o.size ?? 10, bold: !!o.b, color: { argb: o.color ?? INK } };
    if (o.fmt) cell.numFmt = o.fmt;
    cell.alignment = { horizontal: o.align ?? (typeof v === "number" ? "right" : "left"), vertical: "top", wrapText: !!o.wrap };
    if (o.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.fill } };
    return cell;
  };
  put(1, 6, "BUDGET & BILLING", { b: true, size: 13, align: "right" });
  put(2, 6, `${project.name}${project.address ? " — " + project.address : ""}`, { align: "right" });
  put(3, 6, `Prepared for ${project.client_names} · Issued ${issued()}`, { color: MUTED, size: 9, align: "right" });
  ws.getRow(5).height = 6; for (let c = 1; c <= 6; c++) ws.getCell(5, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
  let r = 7;
  if (project.budget_note) {
    put(r, 1, "SCOPE BASIS", { b: true, size: 11 }); r++;
    for (const l of project.budget_note.split("\n")) { ws.mergeCells(r, 1, r, 6); put(r, 1, l, { wrap: true, size: 9.5 }); ws.getRow(r).height = l.length > 130 ? 42 : l.length > 0 ? 15 : 6; r++; }
    r++;
  }
  put(r, 1, "SUMMARY", { b: true, size: 11 }); r++;
  for (const [l, v, b] of [["Original contract", totals.original, false], ["Approved change orders", totals.approvedCos, false], ["Revised contract", totals.revised, true], ["Billed to date", totals.billed, false], ["Remaining to bill", totals.revised - totals.billed, true]] as [string, number, boolean][]) { put(r, 1, l, { b }); put(r, 2, v, { fmt: money, b }); r++; }
  r++;
  const header = (cols: string[]) => { cols.forEach((h, i) => { put(r, i + 1, h, { b: true, size: 9, color: MUTED, align: i >= 1 ? "right" : "left" }); ws.getCell(r, i + 1).border = { bottom: { style: "medium", color: { argb: INK } } }; }); r++; };
  put(r, 1, "BUDGET BY CATEGORY", { b: true, size: 11 }); r++;
  header(["Category", "Budget", "Billed", "Remaining", "Billed %"]);
  const line = (label: string, b: number, bl: number, o: { bold?: boolean; fill?: string; top?: boolean } = {}) => {
    put(r, 1, label, { b: o.bold, fill: o.fill, wrap: true }); put(r, 2, b, { fmt: money, b: o.bold, fill: o.fill }); put(r, 3, bl, { fmt: money, b: o.bold, fill: o.fill }); put(r, 4, b - bl, { fmt: money, b: o.bold, fill: o.fill }); put(r, 5, b > 0 ? bl / b : 0, { fmt: "0%", b: o.bold, fill: o.fill, align: "right" });
    for (let k = 1; k <= 5; k++) ws.getCell(r, k).border = { bottom: { style: "hair", color: { argb: LINE } }, ...(o.top ? { top: { style: "thin", color: { argb: INK } } } : {}) };
    r++;
  };
  for (const b of budget) line(b.category, Number(b.budget), Number(b.billed));
  line("Total", totals.budgetTotal, totals.billed, { bold: true, fill: SUNK, top: true });
  r++;
  if (payApps.length) {
    put(r, 1, "PAY APPLICATIONS", { b: true, size: 11 }); r++;
    header(["Pay app", "Amount", "Status", "Status date", "", "Note"]); ws.getCell(r - 1, 6).alignment = { horizontal: "left" };
    for (const p of payApps) { put(r, 1, `#${p.number} · period ending ${us(p.period_ending)}`); put(r, 2, Number(p.amount), { fmt: money }); put(r, 3, p.status === "paid" ? "Paid" : "Due", { align: "right" }); put(r, 4, us(p.status_date), { align: "right" }); put(r, 6, p.waiver_note, { size: 9, color: MUTED, wrap: true }); r++; }
    const paid = payApps.filter((p) => p.status === "paid").reduce((t, p) => t + Number(p.amount), 0);
    put(r, 1, "Total invoiced", { b: true, fill: SUNK }); put(r, 2, payApps.reduce((t, p) => t + Number(p.amount), 0), { fmt: money, b: true, fill: SUNK }); put(r, 3, `${paid.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} paid`, { fill: SUNK, align: "right" }); r += 2;
  }
  const approved = changeOrders.filter((c) => c.status === "approved");
  if (approved.length) {
    put(r, 1, "APPROVED CHANGE ORDERS", { b: true, size: 11 }); r++;
    header(["Change order", "Amount", "Approved", "Paid"]);
    for (const c of approved) { put(r, 1, `${c.code} · ${c.title}`, { wrap: true }); put(r, 2, Number(c.amount), { fmt: money }); put(r, 3, us(c.decided_date), { align: "right" }); put(r, 4, us(c.paid_date), { align: "right" }); r++; }
    put(r, 1, "Total approved", { b: true, fill: SUNK }); put(r, 2, totals.approvedCos, { fmt: money, b: true, fill: SUNK }); r += 2;
  }
  ws.mergeCells(r, 1, r, 6); put(r, 1, FOOTER, { size: 8, color: MUTED });
  ws.headerFooter.oddFooter = `&L&8${FOOTER}&R&8Page &P of &N`;
  ws.pageSetup.printTitlesRow = "1:5";
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

/* ---------------- PDF ---------------- */
const INKc = rgb(0.14, 0.14, 0.14), MUTEDc = rgb(0.42, 0.42, 0.42), LINEc = rgb(0.85, 0.85, 0.85), SUNKc = rgb(0.945, 0.945, 0.945), YELLOWc = rgb(1, 0.89, 0.06);
const clean = (s: string) => s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/×/g, "x").replace(/•/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
const usd = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildBudgetPdf({ project, budget, payApps, changeOrders, totals }: BudgetExportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${project.name} - Budget & billing`); doc.setAuthor("TCB Consult LLC / TCB Development Ltd.");
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const LOGO = await doc.embedPng(await logoPng());
  const PW = 612, PH = 792, M = 40, W = PW - 2 * M, HEAD_H = 84, BOTTOM = M + 30;
  const CW = { a: 90, b: 90, c: 90, d: 40 }; const itemW = W - CW.a - CW.b - CW.c - CW.d;
  const xA = M + itemW + CW.a, xB = xA + CW.b, xC = xB + CW.c, xD = xC + CW.d;
  const pages: PDFPage[] = []; let page!: PDFPage, y = 0;
  const newPage = () => { page = doc.addPage([PW, PH]); pages.push(page); drawHeader(page, F, B, LOGO, { PW, PH, M, project }); y = PH - M - HEAD_H; };
  const need = (h: number) => { if (y - h < BOTTOM) newPage(); };
  const rt = (txt: string, xr: number, yy: number, size: number, font: PDFFont, color = INKc) => page.drawText(clean(txt), { x: xr - font.widthOfTextAtSize(clean(txt), size), y: yy, size, font, color });
  const title = (t: string) => { need(30); y -= 14; page.drawText(t, { x: M, y, size: 10, font: B, color: INKc }); y -= 12; };
  const colHeader = (cols: [string, number][]) => { need(16); cols.forEach(([h, xr], i) => (i === 0 ? page.drawText(h, { x: M, y, size: 6.5, font: F, color: MUTEDc }) : rt(h, xr, y, 6.5, F, MUTEDc))); y -= 4; page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.8, color: INKc }); y -= 10; };
  const row = (label: string, cells: [string, number][], note = "", o: { bold?: boolean; fill?: boolean; top?: boolean } = {}) => {
    const font = o.bold ? B : F; const ll = wrap(font, label, 8, itemW - 8); const nl = note ? wrap(F, note, 6.5, itemW - 8) : []; const h = ll.length * 10 + nl.length * 8 + 4;
    need(h);
    if (o.fill) page.drawRectangle({ x: M, y: y - h + 7, width: W, height: h, color: SUNKc });
    if (o.top) page.drawLine({ start: { x: M, y: y + 7 }, end: { x: PW - M, y: y + 7 }, thickness: 0.6, color: INKc });
    ll.forEach((l, i) => page.drawText(l, { x: M, y: y - i * 10, size: 8, font, color: INKc }));
    cells.forEach(([t, xr]) => rt(t, xr, y, 8, font));
    let yy = y - ll.length * 10 + 2; nl.forEach((l) => { page.drawText(l, { x: M, y: yy, size: 6.5, font: F, color: MUTEDc }); yy -= 8; });
    y -= h; page.drawLine({ start: { x: M, y: y + 4 }, end: { x: PW - M, y: y + 4 }, thickness: 0.3, color: LINEc });
  };

  newPage();
  if (project.budget_note) {
    title("SCOPE BASIS");
    for (const para of project.budget_note.split("\n")) { if (!para.trim()) { y -= 5; continue; } const ls = wrap(F, para, 8, W); need(ls.length * 10 + 2); ls.forEach((l) => { page.drawText(l, { x: M, y, size: 8, font: F, color: INKc }); y -= 10; }); }
  }
  title("SUMMARY");
  for (const [l, v, b] of [["Original contract", totals.original, false], ["Approved change orders", totals.approvedCos, false], ["Revised contract", totals.revised, true], ["Billed to date", totals.billed, false], ["Remaining to bill", totals.revised - totals.billed, true]] as [string, number, boolean][]) { need(12); page.drawText(l, { x: M, y, size: 8.5, font: b ? B : F, color: INKc }); rt(usd(v), M + 260, y, 8.5, b ? B : F); y -= 12; }
  title("BUDGET BY CATEGORY"); colHeader([["CATEGORY", 0], ["BUDGET", xA], ["BILLED", xB], ["REMAINING", xC], ["BILLED %", xD]]);
  for (const b of budget) row(b.category, [[usd(Number(b.budget)), xA], [usd(Number(b.billed)), xB], [usd(Number(b.budget) - Number(b.billed)), xC], [`${pct(Number(b.budget), Number(b.billed))}%`, xD]]);
  row("Total", [[usd(totals.budgetTotal), xA], [usd(totals.billed), xB], [usd(totals.budgetTotal - totals.billed), xC], [`${pct(totals.budgetTotal, totals.billed)}%`, xD]], "", { bold: true, fill: true, top: true });
  if (payApps.length) {
    title("PAY APPLICATIONS"); colHeader([["PAY APP", 0], ["AMOUNT", xA], ["STATUS", xB], ["DATE", xC]]);
    for (const p of payApps) row(`#${p.number} - period ending ${us(p.period_ending)}`, [[usd(Number(p.amount)), xA], [p.status === "paid" ? "Paid" : "Due", xB], [us(p.status_date), xC]], p.waiver_note);
    const paid = payApps.filter((p) => p.status === "paid").reduce((t, p) => t + Number(p.amount), 0);
    row("Total invoiced", [[usd(payApps.reduce((t, p) => t + Number(p.amount), 0)), xA], [`${usd(paid)} paid`, xC]], "", { bold: true, fill: true, top: true });
  }
  const approved = changeOrders.filter((c) => c.status === "approved");
  if (approved.length) {
    title("APPROVED CHANGE ORDERS"); colHeader([["CHANGE ORDER", 0], ["AMOUNT", xA], ["APPROVED", xB], ["PAID", xC]]);
    for (const c of approved) row(`${c.code} - ${c.title}`, [[usd(Number(c.amount)), xA], [us(c.decided_date), xB], [us(c.paid_date), xC]]);
    row("Total approved", [[usd(totals.approvedCos), xA]], "", { bold: true, fill: true, top: true });
  }
  pages.forEach((pg, i) => { const yy = M - 14; pg.drawLine({ start: { x: M, y: yy + 10 }, end: { x: PW - M, y: yy + 10 }, thickness: 0.5, color: LINEc }); pg.drawText(clean(FOOTER), { x: M, y: yy, size: 6.5, font: F, color: MUTEDc }); const t = `Page ${i + 1} of ${pages.length}`; pg.drawText(t, { x: PW - M - B.widthOfTextAtSize(t, 7), y: yy, size: 7, font: B, color: INKc }); });
  return doc.save();
}

function drawHeader(page: PDFPage, F: PDFFont, B: PDFFont, logo: PDFImage, o: { PW: number; PH: number; M: number; project: Project }) {
  const { PW, PH, M, project } = o; const top = PH - M;
  page.drawRectangle({ x: M, y: top - 3, width: PW - 2 * M, height: 3, color: YELLOWc });
  const w = 96, h = w * (logo.height / logo.width); page.drawImage(logo, { x: M, y: top - 10 - h, width: w, height: h });
  const right = (txt: string, y: number, size: number, font: PDFFont, color = INKc) => page.drawText(clean(txt), { x: PW - M - font.widthOfTextAtSize(clean(txt), size), y, size, font, color });
  right("BUDGET & BILLING", top - 24, 13, B);
  right(`${project.name}${project.address ? " - " + project.address : ""}`, top - 37, 8.5, F);
  if (project.client_names) right(`Prepared for ${project.client_names}`, top - 48, 8, F, MUTEDc);
  right(`${project.current_phase ? project.current_phase + "  ·  " : ""}Issued ${issued()}`, top - 59, 7.5, F, MUTEDc);
  page.drawLine({ start: { x: M, y: top - 70 }, end: { x: PW - M, y: top - 70 }, thickness: 0.5, color: LINEc });
}
