import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord, insuranceTotals } from "@/lib/data";
import { usd } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { saveInsuranceClaim, saveInsuranceLine, importInsuranceLines, deleteRow } from "../actions";
import type { InsuranceLine, InsuranceSection, MoneyLine } from "@/lib/types";
import { ALL_SECTIONS, TIER_SECTIONS, TIER_DEFAULT_LABELS, tierLabel, isTier } from "@/lib/insurance-tiers";

export const metadata = { title: "Insurance comparison" };

const SECTION_LABEL: Record<InsuranceSection, string> = { trade: "By trade", addon: "Permits, tax, overhead and profit", gap: "Scope the carrier did not carry (untiered)", tier1: "Tier 1 — " + TIER_DEFAULT_LABELS.tier1, tier2: "Tier 2 — " + TIER_DEFAULT_LABELS.tier2, tier3: "Tier 3 — " + TIER_DEFAULT_LABELS.tier3, tier4: "Tier 4 — " + TIER_DEFAULT_LABELS.tier4 };
const asText = (xs: MoneyLine[]) => xs.map((l) => `${l.label} | ${l.amount}`).join("\n");

export default async function ManageInsurance({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const c = r.insurance;
  const t = insuranceTotals(r);
  const saveClaim = saveInsuranceClaim.bind(null, id), saveLine = saveInsuranceLine.bind(null, id), importLines = importInsuranceLines.bind(null, id);
  const bySection = (s: InsuranceSection) => r.insuranceLines.filter((l) => l.section === s);

  const LineForm = ({ l, section }: { l?: InsuranceLine; section: InsuranceSection }) => (
    <AdminForm action={saveLine} submit={l ? "Save" : "Add"} reset={!l}>
      {l && <input type="hidden" name="line_id" value={l.id} />}
      <input type="hidden" name="section" value={section} />
      <div className="grid2">
        <div><label>Trade / item</label><input name="category" type="text" defaultValue={l?.category ?? ""} placeholder="DRYWALL" required /></div>
        <div><label>Order</label><input name="sort_order" type="number" defaultValue={l?.sort_order ?? bySection(section).length + 1} /></div>
        <div><label>{c?.carrier_label ?? "Carrier"} amount</label><input name="carrier_amount" type="text" inputMode="decimal" defaultValue={l ? String(l.carrier_amount) : ""} /></div>
        <div><label>{c?.tcb_label ?? "TCB"} amount</label><input name="tcb_amount" type="text" inputMode="decimal" defaultValue={l ? String(l.tcb_amount) : ""} /></div>
      </div>
      <label>Note (shown to client under the line)</label><input name="note" type="text" defaultValue={l?.note ?? ""} />
    </AdminForm>
  );

  return (
    <>
      <div><h1>Insurance comparison</h1><p className="sub">The carrier&rsquo;s estimate re-cut by trade with TCB&rsquo;s market budget beside it. Clients only see this tab when &ldquo;Insurance budget comparison&rdquo; is switched on for them under Clients &amp; access.</p></div>

      {c && (
        <div className="btns" style={{ marginBottom: 12 }}>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.pdf`}>Download PDF</a>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.xlsx`}>Download Excel</a>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.csv`}>Download CSV</a>
        </div>
      )}
      {c && (
        <div className="stats">
          <div className="stat"><span>{c.carrier_label}</span><b>{usd(t.sameScope.carrier)}</b></div>
          <div className="stat"><span>{c.tcb_label} — same scope</span><b>{usd(t.sameScope.tcb)}</b><span>{t.sameScope.carrier > 0 ? `${(t.sameScope.tcb / t.sameScope.carrier).toFixed(2)}×` : ""}</span></div>
          {t.tier.full > t.sameScope.tcb && <div className="stat"><span>Full scope (all tiers)</span><b>{usd(t.tier.full)}</b></div>}
          {t.gaps.tcb > 0 && <div className="stat"><span>With untiered scope not carried</span><b>{usd(t.allIn.tcb)}</b></div>}
          {t.limits > 0 && <div className="stat"><span>Structure limits</span><b>{usd(t.limits)}</b></div>}
        </div>
      )}

      <div className="panel">
        <h2>Claim</h2>
        <AdminForm action={saveClaim} submit={c ? "Save" : "Create"}>
          <div className="grid2">
            <div><label>Carrier</label><input name="carrier" type="text" defaultValue={c?.carrier ?? ""} placeholder="USAA" /></div>
            <div><label>Claim number</label><input name="claim_number" type="text" defaultValue={c?.claim_number ?? ""} /></div>
            <div><label>Date of loss</label><input name="date_of_loss" type="date" defaultValue={c?.date_of_loss ?? ""} /></div>
            <div><label>Carrier estimate date</label><input name="estimate_date" type="date" defaultValue={c?.estimate_date ?? ""} /></div>
            <div><label>Estimate prepared by</label><input name="estimate_by" type="text" defaultValue={c?.estimate_by ?? ""} placeholder="Adjuster name" /></div>
            <div><label>Settlement letter date</label><input name="settlement_date" type="date" defaultValue={c?.settlement_date ?? ""} /></div>
            <div><label>Carrier column label</label><input name="carrier_label" type="text" defaultValue={c?.carrier_label ?? "Carrier estimate"} /></div>
            <div><label>TCB column label</label><input name="tcb_label" type="text" defaultValue={c?.tcb_label ?? "TCB market budget"} /></div>
          </div>
          <label>Introduction (shown to client)</label>
          <textarea name="intro" defaultValue={c?.intro ?? ""} rows={4} />
          <label>What the carrier left out — summary shown under the comparison, one bullet per line</label>
          <textarea name="left_out" defaultValue={c?.left_out ?? ""} rows={6} placeholder={"Seal and paint the balance of the interior walls and ceilings\nPermits, plan check and inspections"} />
          <div className="grid2">
            <div><label>Policy limits — one per line as &ldquo;Label | amount&rdquo;</label><textarea name="limits" defaultValue={c ? asText(c.limits) : ""} rows={6} placeholder={"Dwelling (Coverage A) | 967000\nOther Structures (Coverage B) | 96700"} /></div>
            <div><label>Settlement waterfall — &ldquo;Label | amount&rdquo; (deductions negative)</label><textarea name="settlement" defaultValue={c ? asText(c.settlement) : ""} rows={6} placeholder={"Replacement cost value | 882964.08\nLess recoverable depreciation | -31567.04"} /></div>
          </div>
          <h3 style={{ marginBottom: 4 }}>Scope-not-carried tiers</h3>
          <p className="note" style={{ marginTop: 0 }}>Overhead and fee apply to tiers 1–3 in the running totals; tier 4 (soft costs) is carried at cost. Leave a label blank to use the default.</p>
          <div className="grid2">
            <div><label>Overhead on tiers 1–3 (%)</label><input name="tier_overhead" type="text" inputMode="decimal" defaultValue={c ? String(Number(c.tier_overhead) * 100) : "0"} /></div>
            <div><label>Fee on tiers 1–3 (%)</label><input name="tier_fee" type="text" inputMode="decimal" defaultValue={c ? String(Number(c.tier_fee) * 100) : "0"} /></div>
            {TIER_SECTIONS.map((s, i) => <div key={s}><label>Tier {i + 1} label</label><input name={`tier_label_${s}`} type="text" defaultValue={c?.tier_labels?.[s] ?? ""} placeholder={TIER_DEFAULT_LABELS[s]} /></div>)}
          </div>
          <label>Note shown above the tiers (shown to client)</label>
          <textarea name="tier_intro" defaultValue={c?.tier_intro ?? ""} rows={3} />
          <label>Working notes (builder only)</label>
          <textarea name="notes" defaultValue={c?.notes ?? ""} rows={3} />
        </AdminForm>
      </div>

      {ALL_SECTIONS.map((s) => {
        const rows = bySection(s);
        return (
          <div className="panel" key={s}>
            <h2>{isTier(s) ? `Tier ${TIER_SECTIONS.indexOf(s) + 1} — ${tierLabel(c, s)}` : SECTION_LABEL[s]}{rows.length ? ` (${rows.length})` : ""}</h2>
            {s === "gap" && <p className="note" style={{ marginTop: 0 }}>Untiered scope adds — use the tiers below instead so the client sees running totals.</p>}
            {isTier(s) && <p className="note" style={{ marginTop: 0 }}>Enter TCB amounts before overhead and fee; the carrier amount is what the carrier actually carried for the item (usually 0). The note under each line is where to say what the carrier carried instead.</p>}
            {rows.map((l) => (
              <details className="panel" key={l.id} style={{ marginBottom: 8 }}>
                <summary>{l.category} <span className="num" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {usd(l.carrier_amount)} vs {usd(l.tcb_amount)}</span></summary>
                <LineForm l={l} section={s} />
                <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "insurance_lines", l.id)} /></div>
              </details>
            ))}
            {rows.length > 0 && (
              <div className="row" style={{ borderTop: "2px solid var(--ink)", marginTop: 4, paddingTop: 10, fontWeight: 700 }}>
                <div className="grow">Subtotal — {rows.length} lines</div>
                <span className="num">{usd(rows.reduce((a, l) => a + Number(l.carrier_amount), 0))} vs {usd(rows.reduce((a, l) => a + Number(l.tcb_amount), 0))}</span>
              </div>
            )}
            <details className="panel" style={{ marginTop: 12 }}>
              <summary>Add a line</summary>
              <LineForm section={s} />
            </details>
            <details className="panel" style={{ marginTop: 8 }}>
              <summary>Paste from Excel</summary>
              <AdminForm action={importLines} submit="Import" reset>
                <input type="hidden" name="section" value={s} />
                <label>One row per line: trade, carrier amount, TCB amount, optional note (tab- or comma-separated)</label>
                <textarea name="paste" rows={6} placeholder={"DRYWALL\t38550.09\t59909.32\nPAINTING\t77504.73\t102727.23"} />
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="replace" style={{ width: "auto" }} />Replace the existing lines in this section</label>
              </AdminForm>
            </details>
          </div>
        );
      })}
    </>
  );
}
