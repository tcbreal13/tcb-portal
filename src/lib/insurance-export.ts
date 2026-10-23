import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InsuranceClaim, InsuranceLine, Project } from "@/lib/types";

export interface InsuranceExportInput {
  project: Project; claim: InsuranceClaim; lines: InsuranceLine[];
  totals: { trades: { carrier: number; tcb: number }; addons: { carrier: number; tcb: number }; gaps: { carrier: number; tcb: number }; sameScope: { carrier: number; tcb: number }; allIn: { carrier: number; tcb: number }; limits: number };
}

const SECTION_TITLE = { trade: "By trade", addon: "Permits, tax, overhead and profit", gap: "Scope the carrier did not carry" } as const;
const FOOTER = "TCB Consult LLC / TCB Development Ltd. · CSLB Lic # 1093014 · tim@tcbreal.com · (310) 984-6621 · www.tcbreal.com";
const issued = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const bullets = (c: InsuranceClaim) => c.left_out.split("\n").map((l) => l.trim()).filter(Boolean);

/** Charcoal TCB logo from /public, as a PNG buffer for exports. */
export async function logoPng(): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "logo-dark.png"));
}

export function insuranceFileStem(p: Project) {
  return `${p.name.replace(/[^A-Za-z0-9]+/g, "-")}-insurance-comparison-${new Date().toISOString().slice(0, 10)}`;
}

/** Comma-separated version. The logo can't live in a CSV, so the TCB header rows carry the identification instead. */
export function buildInsuranceCsv({ project, claim, lines, totals }: InsuranceExportInput): string {
  const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const row = (...cells: (string | number)[]) => cells.map(esc).join(",");
  const out: string[] = [
    row("TCB Consult LLC / TCB Development Ltd. — Insurance budget comparison"),
    row(`${project.name}${project.address ? " — " + project.address : ""}`),
    row(`Prepared for ${project.client_names}`, `Issued ${issued()}`),
    row(`${claim.carrier} claim ${claim.claim_number}`, claim.estimate_date ? `Carrier estimate ${claim.estimate_date}${claim.estimate_by ? " (" + claim.estimate_by + ")" : ""}` : ""),
    "",
    row("Section", "Trade / item", claim.carrier_label, claim.tcb_label, "Difference", "TCB ÷ carrier", "Note"),
  ];
  for (const s of ["trade", "addon", "gap"] as const) {
    const rows = lines.filter((l) => l.section === s);
    if (!rows.length) continue;
    for (const l of rows) {
      const c = Number(l.carrier_amount), t = Number(l.tcb_amount);
      out.push(row(SECTION_TITLE[s], l.category, c.toFixed(2), t.toFixed(2), (t - c).toFixed(2), c > 0 ? (t / c).toFixed(2) : "", l.note));
    }
    const sub = s === "trade" ? totals.trades : s === "addon" ? totals.addons : totals.gaps;
    out.push(row(SECTION_TITLE[s], `Subtotal — ${SECTION_TITLE[s].toLowerCase()}`, sub.carrier.toFixed(2), sub.tcb.toFixed(2), (sub.tcb - sub.carrier).toFixed(2), sub.carrier > 0 ? (sub.tcb / sub.carrier).toFixed(2) : "", ""));
  }
  out.push(row("Total", "Replacement cost value — same scope as the carrier", totals.sameScope.carrier.toFixed(2), totals.sameScope.tcb.toFixed(2), (totals.sameScope.tcb - totals.sameScope.carrier).toFixed(2), totals.sameScope.carrier > 0 ? (totals.sameScope.tcb / totals.sameScope.carrier).toFixed(2) : "", ""));
  if (totals.gaps.tcb) out.push(row("Total", "TCB repair / restoration total (with scope not carried)", totals.allIn.carrier.toFixed(2), totals.allIn.tcb.toFixed(2), (totals.allIn.tcb - totals.allIn.carrier).toFixed(2), "", ""));
  if (bullets(claim).length) { out.push("", row(`What ${claim.carrier || "the carrier"} left out`)); for (const b of bullets(claim)) out.push(row("", `• ${b}`)); }
  if (claim.limits.length) { out.push("", row("Policy limits (per carrier estimate)")); for (const l of claim.limits) out.push(row("", l.label, Number(l.amount).toFixed(2))); out.push(row("", "Total structure-related limits", totals.limits.toFixed(2))); }
  if (claim.settlement.length) { out.push("", row(`Carrier settlement${claim.settlement_date ? " — " + claim.settlement_date : ""}`)); for (const l of claim.settlement) out.push(row("", l.label, Number(l.amount).toFixed(2))); }
  out.push("", row(FOOTER));
  return "﻿" + out.join("\r\n") + "\r\n";
}

/** Excel version with the TCB logo in the header, formatted currency and totals. */
export async function buildInsuranceXlsx(input: InsuranceExportInput): Promise<Buffer> {
  const { project, claim, lines, totals } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = "TCB Consult LLC / TCB Development Ltd.";
  const ws = wb.addWorksheet("Comparison", { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 48 }, { width: 17 }, { width: 17 }, { width: 15 }, { width: 11 }, { width: 46 }];
  const INK = "FF242424", MUTED = "FF6B6B6B", LINE = "FFD9D9D9", SUNK = "FFF1F1F1", YELLOW = "FFFFE30F";
  const money = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

  // logo: 900x366 PNG scaled to ~1.9in wide across rows 1-4
  const logo = wb.addImage({ buffer: (await logoPng()) as unknown as ExcelJS.Buffer, extension: "png" });
  // two-cell anchor: the one-cell form renders in LibreOffice but Excel for Mac / iPad and Quick Look drop it
  for (let i = 1; i <= 4; i++) ws.getRow(i).height = 19;
  // native offsets are EMU (914400 per inch): logo 1.85in x 0.75in inside column A, rows 1-4
  ws.addImage(logo, { tl: { nativeCol: 0, nativeColOff: 0, nativeRow: 0, nativeRowOff: 45720 }, br: { nativeCol: 0, nativeColOff: 1691640, nativeRow: 3, nativeRowOff: 182880 }, editAs: "twoCell" } as never);
  const put = (r: number, c: number, v: ExcelJS.CellValue, o: { b?: boolean; size?: number; color?: string; fmt?: string; align?: "left" | "right"; fill?: string; wrap?: boolean } = {}) => {
    const cell = ws.getCell(r, c); cell.value = v;
    cell.font = { name: "Arial", size: o.size ?? 10, bold: !!o.b, color: { argb: o.color ?? INK } };
    if (o.fmt) cell.numFmt = o.fmt;
    cell.alignment = { horizontal: o.align ?? (typeof v === "number" ? "right" : "left"), vertical: "top", wrapText: !!o.wrap };
    if (o.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.fill } };
    return cell;
  };
  put(1, 6, "INSURANCE BUDGET COMPARISON", { b: true, size: 13, align: "right" });
  put(2, 6, `${project.name}${project.address ? " — " + project.address : ""}`, { align: "right" });
  put(3, 6, `Prepared for ${project.client_names} · Issued ${issued()}`, { color: MUTED, size: 9, align: "right" });
  put(4, 6, [claim.carrier && `${claim.carrier} claim ${claim.claim_number}`, claim.date_of_loss && `Date of loss ${claim.date_of_loss}`, claim.estimate_date && `Carrier estimate ${claim.estimate_date}${claim.estimate_by ? " (" + claim.estimate_by + ")" : ""}`].filter(Boolean).join(" · "), { color: MUTED, size: 9, align: "right" });
  ws.getRow(5).height = 6; for (let c = 1; c <= 6; c++) ws.getCell(5, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
  let r = 7;
  if (claim.intro) { ws.mergeCells(r, 1, r, 6); put(r, 1, claim.intro, { wrap: true, size: 9.5 }); ws.getRow(r).height = Math.max(30, Math.ceil(claim.intro.length / 120) * 14); r += 2; }

  const header = () => {
    ["Trade / item", claim.carrier_label, claim.tcb_label, "Difference", "TCB ÷ carrier", "Note"].forEach((h, i) => { put(r, i + 1, h, { b: true, size: 9, color: MUTED, align: i >= 1 && i <= 4 ? "right" : "left" }); ws.getCell(r, i + 1).border = { bottom: { style: "medium", color: { argb: INK } } }; });
    r++;
  };
  const line = (label: string, c: number, t: number, note = "", o: { b?: boolean; fill?: string; top?: boolean } = {}) => {
    put(r, 1, label, { b: o.b, fill: o.fill, wrap: true }); put(r, 2, c, { fmt: money, b: o.b, fill: o.fill }); put(r, 3, t, { fmt: money, b: o.b, fill: o.fill });
    put(r, 4, t - c, { fmt: money, b: o.b, fill: o.fill }); put(r, 5, c > 0 ? t / c : "", { fmt: '0.00"×"', b: o.b, fill: o.fill, align: "right" }); put(r, 6, note, { size: 9, color: MUTED, fill: o.fill, wrap: true });
    for (let k = 1; k <= 6; k++) ws.getCell(r, k).border = { bottom: { style: "hair", color: { argb: LINE } }, ...(o.top ? { top: { style: "thin", color: { argb: INK } } } : {}) };
    r++;
  };
  for (const s of ["trade", "addon", "gap"] as const) {
    const rows = lines.filter((l) => l.section === s);
    if (!rows.length) continue;
    put(r, 1, SECTION_TITLE[s].toUpperCase(), { b: true, size: 11 }); r++;
    header();
    for (const l of rows) line(l.category, Number(l.carrier_amount), Number(l.tcb_amount), l.note);
    const sub = s === "trade" ? totals.trades : s === "addon" ? totals.addons : totals.gaps;
    line(`Subtotal — ${SECTION_TITLE[s].toLowerCase()}`, sub.carrier, sub.tcb, "", { b: true, fill: SUNK, top: true });
    r++;
  }
  put(r, 1, "TOTALS", { b: true, size: 11 }); r++; header();
  line("Replacement cost value — same scope as the carrier", totals.sameScope.carrier, totals.sameScope.tcb, "", { b: true, fill: SUNK });
  if (totals.gaps.tcb) line("TCB repair / restoration total (with scope not carried)", totals.allIn.carrier, totals.allIn.tcb, "", { b: true, fill: SUNK });
  r++;
  const bl = bullets(claim);
  if (bl.length) {
    put(r, 1, `WHAT ${(claim.carrier || "THE CARRIER").toUpperCase()} LEFT OUT`, { b: true, size: 11 }); r++;
    for (const b of bl) { ws.mergeCells(r, 1, r, 6); put(r, 1, `•  ${b}`, { wrap: true, size: 9.5 }); ws.getRow(r).height = b.length > 110 ? 28 : 15; r++; }
    r++;
  }
  if (claim.limits.length || claim.settlement.length) {
    const start = r;
    if (claim.limits.length) {
      put(r, 1, "POLICY LIMITS (PER CARRIER ESTIMATE)", { b: true, size: 11 }); r++;
      for (const l of claim.limits) { put(r, 1, l.label); put(r, 2, Number(l.amount), { fmt: money }); r++; }
      put(r, 1, "Total structure-related limits", { b: true }); put(r, 2, totals.limits, { fmt: money, b: true }); ws.getCell(r, 2).border = { top: { style: "thin", color: { argb: INK } } }; r++;
    }
    if (claim.settlement.length) {
      let rr = start;
      put(rr, 4, `CARRIER SETTLEMENT${claim.settlement_date ? " — " + claim.settlement_date : ""}`, { b: true, size: 11 }); rr++;
      for (const l of claim.settlement) { ws.mergeCells(rr, 4, rr, 5); put(rr, 4, l.label); put(rr, 6, Number(l.amount), { fmt: money }); rr++; }
      r = Math.max(r, rr);
    }
    r++;
  }
  ws.mergeCells(r, 1, r, 6); put(r, 1, "TCB market figures are TCB's estimate of current Pacific Palisades post-fire pricing for the carrier's scope — a comparison basis for the claim, not a contract price.", { size: 8.5, color: MUTED, wrap: true }); ws.getRow(r).height = 26; r++;
  ws.mergeCells(r, 1, r, 6); put(r, 1, FOOTER, { size: 8, color: MUTED });
  ws.headerFooter.oddFooter = `&L&8${FOOTER}&R&8Page &P of &N`;
  ws.pageSetup.printTitlesRow = "1:5";
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
