import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { logoPng, type InsuranceExportInput } from "@/lib/insurance-export";
import type { InsuranceLine } from "@/lib/types";

/* Brand colours (print on white) */
const INK = rgb(0.14, 0.14, 0.14), MUTED = rgb(0.42, 0.42, 0.42), LINE = rgb(0.85, 0.85, 0.85), SUNK = rgb(0.945, 0.945, 0.945), YELLOW = rgb(1, 0.89, 0.06);
const clean = (s: string) => s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/×/g, "x").replace(/•/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
const usd = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number) => (n >= 0 ? "+" : "") + usd(n);
const ratio = (c: number, t: number) => (c > 0 ? `${(t / c).toFixed(2)}x` : "-");
const us = (iso: string | null) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}/${y}`; };
const SECTION_TITLE = { trade: "BY TRADE", addon: "PERMITS, TAX, OVERHEAD AND PROFIT", gap: "SCOPE THE CARRIER DID NOT CARRY" } as const;

/** Word-wrap to a width. */
function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** Portrait-letter comparison: carrier vs TCB by trade, add-ons, totals, what was left out. Paged as needed. */
export async function buildInsurancePdf({ project, claim, lines, totals }: InsuranceExportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${project.name} - Insurance budget comparison`);
  doc.setAuthor("TCB Consult LLC / TCB Development Ltd.");
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const LOGO = await doc.embedPng(await logoPng());

  const PW = 612, PH = 792, M = 40, W = PW - 2 * M;
  // columns: item | carrier | tcb | diff | ratio
  const CW = { carrier: 84, tcb: 84, diff: 80, ratio: 46 };
  const itemW = W - CW.carrier - CW.tcb - CW.diff - CW.ratio;
  const xItem = M, xCar = M + itemW + CW.carrier, xTcb = xCar + CW.tcb, xDiff = xTcb + CW.diff, xRatio = xDiff + CW.ratio;
  const HEAD_H = 96, FOOT_H = 30, BOTTOM = M + FOOT_H;

  const pages: PDFPage[] = [];
  let page!: PDFPage, y = 0;
  const newPage = () => { page = doc.addPage([PW, PH]); pages.push(page); drawHeader(page, F, B, LOGO, { PW, PH, M, project, claim }); y = PH - M - HEAD_H; };
  const need = (h: number) => { if (y - h < BOTTOM) newPage(); };
  const rightText = (txt: string, xRight: number, yy: number, size: number, font: PDFFont, color = INK) => page.drawText(clean(txt), { x: xRight - font.widthOfTextAtSize(clean(txt), size), y: yy, size, font, color });

  const sectionTitle = (t: string) => { need(30); y -= 14; page.drawText(t, { x: M, y, size: 10, font: B, color: INK }); y -= 12; };
  const colHeader = (showRatio: boolean) => {
    need(16);
    page.drawText("TRADE / ITEM", { x: xItem, y, size: 6.5, font: F, color: MUTED });
    rightText(clean(claim.carrier_label).toUpperCase(), xCar, y, 6.5, F, MUTED);
    rightText(clean(claim.tcb_label).toUpperCase(), xTcb, y, 6.5, F, MUTED);
    rightText("DIFFERENCE", xDiff, y, 6.5, F, MUTED);
    if (showRatio) rightText("RATIO", xRatio, y, 6.5, F, MUTED);
    y -= 4; page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.8, color: INK }); y -= 10;
  };
  const row = (label: string, c: number, t: number, note: string, o: { bold?: boolean; fill?: boolean; top?: boolean; showRatio?: boolean } = {}) => {
    const font = o.bold ? B : F, size = 8;
    const labelLines = wrap(font, label, size, itemW - 8);
    const noteLines = note ? wrap(F, note, 6.5, itemW - 8) : [];
    const h = labelLines.length * 10 + noteLines.length * 8 + 4;
    need(h);
    if (o.fill) page.drawRectangle({ x: M, y: y - h + 7, width: W, height: h, color: SUNK });
    if (o.top) page.drawLine({ start: { x: M, y: y + 7 }, end: { x: PW - M, y: y + 7 }, thickness: 0.6, color: INK });
    labelLines.forEach((l, i) => page.drawText(l, { x: xItem, y: y - i * 10, size, font, color: INK }));
    rightText(usd(c), xCar, y, size, font); rightText(usd(t), xTcb, y, size, font); rightText(signed(t - c), xDiff, y, size, font, t - c > 0 ? INK : MUTED);
    if (o.showRatio !== false) rightText(ratio(c, t), xRatio, y, size, font, MUTED);
    let yy = y - labelLines.length * 10 + 2;
    noteLines.forEach((l) => { page.drawText(l, { x: xItem, y: yy, size: 6.5, font: F, color: MUTED }); yy -= 8; });
    y -= h; page.drawLine({ start: { x: M, y: y + 4 }, end: { x: PW - M, y: y + 4 }, thickness: 0.3, color: LINE });
  };

  newPage();
  if (claim.intro) {
    const ls = wrap(F, claim.intro, 8, W); need(ls.length * 10 + 6);
    ls.forEach((l) => { page.drawText(l, { x: M, y, size: 8, font: F, color: INK }); y -= 10; });
    y -= 4;
  }

  for (const s of ["trade", "addon", "gap"] as const) {
    const rows = lines.filter((l) => l.section === s) as InsuranceLine[];
    if (!rows.length) continue;
    const showRatio = s === "trade";
    sectionTitle(SECTION_TITLE[s]); colHeader(showRatio);
    for (const l of rows) row(l.category, Number(l.carrier_amount), Number(l.tcb_amount), l.note, { showRatio });
    const sub = s === "trade" ? totals.trades : s === "addon" ? totals.addons : totals.gaps;
    row(`Subtotal - ${SECTION_TITLE[s].toLowerCase()}`, sub.carrier, sub.tcb, "", { bold: true, fill: true, top: true, showRatio });
    y -= 6;
  }

  sectionTitle("TOTALS"); colHeader(true);
  row("Replacement cost value - same scope as the carrier", totals.sameScope.carrier, totals.sameScope.tcb, "", { bold: true, fill: true });
  if (totals.gaps.tcb) row("TCB repair / restoration total (with scope not carried)", totals.allIn.carrier, totals.allIn.tcb, "", { bold: true, fill: true });

  const bullets = claim.left_out.split("\n").map((l) => l.trim()).filter(Boolean);
  if (bullets.length) {
    sectionTitle(`WHAT ${clean(claim.carrier || "THE CARRIER").toUpperCase()} LEFT OUT`);
    for (const b of bullets) {
      const ls = wrap(F, b, 8, W - 14); need(ls.length * 10 + 3);
      page.drawText("-", { x: M + 2, y, size: 8, font: B, color: INK });
      ls.forEach((l) => { page.drawText(l, { x: M + 14, y, size: 8, font: F, color: INK }); y -= 10; });
      y -= 3;
    }
  }

  if (claim.limits.length || claim.settlement.length) {
    const half = (W - 20) / 2;
    const block = (title: string, items: { label: string; amount: number }[], x0: number, total?: { label: string; amount: number }) => {
      let yy = y;
      page.drawText(title, { x: x0, y: yy, size: 9, font: B, color: INK }); yy -= 12;
      for (const it of items) { page.drawText(clean(it.label).slice(0, 60), { x: x0, y: yy, size: 7.5, font: F, color: INK }); rightText(usd(Number(it.amount)), x0 + half, yy, 7.5, F); yy -= 10; }
      if (total) { page.drawLine({ start: { x: x0, y: yy + 7 }, end: { x: x0 + half, y: yy + 7 }, thickness: 0.6, color: INK }); page.drawText(total.label, { x: x0, y: yy, size: 7.5, font: B, color: INK }); rightText(usd(total.amount), x0 + half, yy, 7.5, B); yy -= 10; }
      return yy;
    };
    const n = Math.max(claim.limits.length, claim.settlement.length) + 3;
    need(n * 10 + 24); y -= 16;
    let yl = y, ys = y;
    if (claim.limits.length) yl = block("POLICY LIMITS (PER CARRIER ESTIMATE)", claim.limits, M, { label: "Total structure-related limits", amount: totals.limits });
    if (claim.settlement.length) ys = block(`CARRIER SETTLEMENT${claim.settlement_date ? " - " + us(claim.settlement_date) : ""}`, claim.settlement, M + half + 20);
    y = Math.min(yl, ys);
  }

  y -= 14; const disc = wrap(F, "TCB market figures are TCB's estimate of current Pacific Palisades post-fire pricing for the carrier's scope. They are a comparison basis for the claim, not a contract price; the construction contract and change orders remain under Budget & billing and Change orders.", 7, W);
  need(disc.length * 9); disc.forEach((l) => { page.drawText(l, { x: M, y, size: 7, font: F, color: MUTED }); y -= 9; });

  pages.forEach((pg, i) => drawFooter(pg, F, B, { M, PW, pi: i, n: pages.length }));
  return doc.save();
}

function drawHeader(page: PDFPage, F: PDFFont, B: PDFFont, logo: PDFImage, o: { PW: number; PH: number; M: number; project: InsuranceExportInput["project"]; claim: InsuranceExportInput["claim"] }) {
  const { PW, PH, M, project, claim } = o; const top = PH - M;
  page.drawRectangle({ x: M, y: top - 3, width: PW - 2 * M, height: 3, color: YELLOW });
  const w = 96, h = w * (logo.height / logo.width);
  page.drawImage(logo, { x: M, y: top - 10 - h, width: w, height: h });
  const right = (txt: string, y: number, size: number, font: PDFFont, color = INK) => page.drawText(clean(txt), { x: PW - M - font.widthOfTextAtSize(clean(txt), size), y, size, font, color });
  right("INSURANCE BUDGET COMPARISON", top - 24, 13, B);
  right(`${project.name}${project.address ? " - " + project.address : ""}`, top - 37, 8.5, F);
  if (project.client_names) right(`Prepared for ${project.client_names}`, top - 48, 8, F, MUTED);
  const meta = [claim.carrier && `${claim.carrier} claim ${claim.claim_number}`, claim.date_of_loss && `Date of loss ${us(claim.date_of_loss)}`, claim.estimate_date && `Carrier estimate ${us(claim.estimate_date)}${claim.estimate_by ? " (" + claim.estimate_by + ")" : ""}`].filter(Boolean).join("  ·  ");
  if (meta) right(meta, top - 59, 7.5, F, MUTED);
  right(`Issued ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, top - 70, 7.5, F, MUTED);
  page.drawLine({ start: { x: M, y: top - 82 }, end: { x: PW - M, y: top - 82 }, thickness: 0.5, color: LINE });
}

function drawFooter(page: PDFPage, F: PDFFont, B: PDFFont, o: { M: number; PW: number; pi: number; n: number }) {
  const y = o.M - 14;
  page.drawLine({ start: { x: o.M, y: y + 10 }, end: { x: o.PW - o.M, y: y + 10 }, thickness: 0.5, color: LINE });
  page.drawText("TCB Consult LLC / TCB Development Ltd.  ·  CSLB Lic # 1093014  ·  tim@tcbreal.com  ·  (310) 984-6621  ·  www.tcbreal.com", { x: o.M, y, size: 6.5, font: F, color: MUTED });
  const pg = `Page ${o.pi + 1} of ${o.n}`; page.drawText(pg, { x: o.PW - o.M - B.widthOfTextAtSize(pg, 7), y, size: 7, font: B, color: INK });
}
