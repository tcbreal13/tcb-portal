import { notFound } from "next/navigation";
import { requireSection, insuranceTotals } from "@/lib/data";
import { usd, fdate } from "@/lib/format";
import type { InsuranceLine } from "@/lib/types";
import { TIER_SECTIONS, tierLabel } from "@/lib/insurance-tiers";

export const metadata = { title: "Insurance budget comparison" };

const ratio = (c: number, t: number) => (c > 0 ? `${(t / c).toFixed(2)}×` : "—");
const delta = (c: number, t: number) => {
  const d = t - c;
  return <span style={{ color: d > 0 ? "var(--ink)" : "var(--muted)" }}>{d >= 0 ? "+" : ""}{usd(d)}</span>;
};

function Lines({ rows, carrierLabel, tcbLabel, total, totalLabel, showRatio = true }: { rows: InsuranceLine[]; carrierLabel: string; tcbLabel: string; total: { carrier: number; tcb: number }; totalLabel: string; showRatio?: boolean }) {
  return (
    <table>
      <thead><tr><th>Trade / item</th><th className="r">{carrierLabel}</th><th className="r">{tcbLabel}</th><th className="r">Difference</th>{showRatio && <th className="r">TCB ÷ carrier</th>}</tr></thead>
      <tbody>
        {rows.map((l) => (
          <tr key={l.id}>
            <td>{l.category}{l.note && <div className="d" style={{ fontSize: 12.5, color: "var(--muted)" }}>{l.note}</div>}</td>
            <td className="r num">{usd(l.carrier_amount)}</td>
            <td className="r num">{usd(l.tcb_amount)}</td>
            <td className="r num">{delta(Number(l.carrier_amount), Number(l.tcb_amount))}</td>
            {showRatio && <td className="r num">{ratio(Number(l.carrier_amount), Number(l.tcb_amount))}</td>}
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td>{totalLabel}</td><td className="r num">{usd(total.carrier)}</td><td className="r num">{usd(total.tcb)}</td><td className="r num">{delta(total.carrier, total.tcb)}</td>{showRatio && <td className="r num">{ratio(total.carrier, total.tcb)}</td>}</tr></tfoot>
    </table>
  );
}

export default async function Insurance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await requireSection(id, "insurance");
  if (!r) notFound();
  const c = r.insurance;
  if (!c) {
    return (<><div><h1>Insurance budget comparison</h1></div><div className="panel"><p className="note" style={{ margin: 0 }}>The insurance comparison will appear here once it&rsquo;s posted.</p></div></>);
  }
  const t = insuranceTotals(r);
  const trades = r.insuranceLines.filter((l) => l.section === "trade");
  const addons = r.insuranceLines.filter((l) => l.section === "addon");
  const gaps = r.insuranceLines.filter((l) => l.section === "gap");
  const tiers = TIER_SECTIONS.map((s) => ({ s, rows: r.insuranceLines.filter((l) => l.section === s) })).filter((x) => x.rows.length);
  const hasTiers = tiers.length > 0;
  const tier1 = t.tier.steps.find((x) => x.key === "tier1");
  const meta = [c.carrier && `${c.carrier}`, c.claim_number && `Claim ${c.claim_number}`, c.date_of_loss && `Date of loss ${fdate(c.date_of_loss)}`, c.estimate_date && `Carrier estimate ${fdate(c.estimate_date)}${c.estimate_by ? ` (${c.estimate_by})` : ""}`, c.settlement_date && `Settlement letter ${fdate(c.settlement_date)}`].filter(Boolean).join(" · ");

  return (
    <>
      <div className="row nt">
        <div className="grow"><h1>Insurance budget comparison</h1><p className="sub">{meta}</p></div>
        <div className="btns" style={{ gap: 6 }}>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.pdf`}>PDF</a>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.xlsx`}>Excel</a>
          <a className="btn ghost sm" href={`/p/${id}/insurance/comparison.csv`}>CSV</a>
        </div>
      </div>
      {c.intro && <div className="panel"><p style={{ margin: 0, maxWidth: "80ch", whiteSpace: "pre-wrap" }}>{c.intro}</p></div>}

      <div className="stats">
        <div className="stat"><span>{c.carrier_label} — replacement cost</span><b>{usd(t.sameScope.carrier)}</b></div>
        <div className="stat"><span>{c.tcb_label} — same scope</span><b>{usd(t.sameScope.tcb)}</b><span>{ratio(t.sameScope.carrier, t.sameScope.tcb)} the carrier figure</span></div>
        {hasTiers && tier1 && <div className="stat"><span>{c.tcb_label} — rebuild scope per the toxicology report</span><b>{usd(tier1.running)}</b><span>before code upgrades, fire measures and soft costs</span></div>}
        {hasTiers && <div className="stat"><span>{c.tcb_label} — full scope</span><b>{usd(t.tier.full)}</b><span>{ratio(t.sameScope.carrier, t.tier.full)} the carrier figure</span></div>}
        {!hasTiers && gaps.length > 0 && <div className="stat"><span>{c.tcb_label} — with scope not carried</span><b>{usd(t.allIn.tcb)}</b><span>+{usd(t.gaps.tcb)} scope adds</span></div>}
        {t.limits > 0 && <div className="stat"><span>Structure-related policy limits</span><b>{usd(t.limits)}</b><span>{t.allIn.tcb > t.limits ? `TCB figure is ${usd(t.allIn.tcb - t.limits)} over limits` : `${usd(t.limits - t.allIn.tcb)} headroom`}</span></div>}
      </div>

      {trades.length > 0 && (
        <div className="panel scroll">
          <h2>By trade</h2>
          <p className="note" style={{ marginTop: 0 }}>Each trade is shown exactly as the carrier categorized it, with TCB&rsquo;s current Pacific Palisades market pricing for the same scope beside it.</p>
          <Lines rows={trades} carrierLabel={c.carrier_label} tcbLabel={c.tcb_label} total={t.trades} totalLabel="Subtotal of trades" />
        </div>
      )}

      {addons.length > 0 && (
        <div className="panel scroll">
          <h2>Permits, tax, overhead and profit</h2>
          <Lines rows={addons} carrierLabel={c.carrier_label} tcbLabel={c.tcb_label} total={t.addons} totalLabel="Subtotal of add-ons" showRatio={false} />
          <table style={{ marginTop: 12 }}>
            <tfoot><tr><td>Replacement cost value — same scope as the carrier</td><td className="r num">{usd(t.sameScope.carrier)}</td><td className="r num">{usd(t.sameScope.tcb)}</td><td className="r num">{delta(t.sameScope.carrier, t.sameScope.tcb)}</td><td className="r num">{ratio(t.sameScope.carrier, t.sameScope.tcb)}</td></tr></tfoot>
          </table>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="panel scroll">
          <h2>Scope the carrier did not carry</h2>
          <p className="note" style={{ marginTop: 0 }}>Work a licensed contractor needs to perform the carrier&rsquo;s scope to code and to wildfire-smoke restoration standards, priced by TCB.</p>
          <Lines rows={gaps} carrierLabel={c.carrier_label} tcbLabel={c.tcb_label} total={t.gaps} totalLabel="Total scope adds" showRatio={false} />
          <table style={{ marginTop: 12 }}>
            <tfoot><tr><td>TCB repair / restoration total</td><td className="r num">{usd(t.allIn.carrier)}</td><td className="r num">{usd(t.allIn.tcb)}</td><td className="r num">{delta(t.allIn.carrier, t.allIn.tcb)}</td><td className="r num">{ratio(t.allIn.carrier, t.allIn.tcb)}</td></tr></tfoot>
          </table>
        </div>
      )}

      {hasTiers && (
        <div className="panel scroll">
          <h2>Scope the carrier did not carry</h2>
          {c.tier_intro.trim() && <p className="note" style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{c.tier_intro}</p>}
          {tiers.map(({ s, rows }, i) => (
            <div key={s} style={{ marginTop: i ? 18 : 0 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>{i + 1}. {tierLabel(c, s)}</h3>
              <Lines rows={rows} carrierLabel={c.carrier_label} tcbLabel={c.tcb_label} total={{ carrier: rows.reduce((a, l) => a + Number(l.carrier_amount), 0), tcb: t.tier.tiers[s] }} totalLabel={`Subtotal — tier ${i + 1}${s !== "tier4" ? " (before overhead and fee)" : " (at cost)"}`} showRatio={false} />
            </div>
          ))}
        </div>
      )}

      {hasTiers && (
        <div className="panel scroll">
          <h2>Running totals</h2>
          <p className="note" style={{ marginTop: 0 }}>Each tier is added on top of the previous figure, so the budget can be read at any stopping point.</p>
          <table>
            <thead><tr><th>Step</th><th className="r">Added</th><th className="r">Running total</th></tr></thead>
            <tbody>
              {t.tier.steps.map((x) => (
                <tr key={x.key} style={x.emphasis ? { fontWeight: 700 } : undefined}>
                  <td>{x.label}</td>
                  <td className="r num">{x.add === null ? "" : (x.add >= 0 ? "+" : "") + usd(x.add)}</td>
                  <td className="r num">{usd(x.running)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>{c.tcb_label} — full scope</td><td className="r num">{(t.tier.full - t.sameScope.carrier >= 0 ? "+" : "") + usd(t.tier.full - t.sameScope.carrier)} vs. {c.carrier_label.toLowerCase()}</td><td className="r num">{usd(t.tier.full)}</td></tr></tfoot>
          </table>
        </div>
      )}

      {c.left_out.trim() && (
        <div className="panel">
          <h2>What {c.carrier || "the carrier"} left out</h2>
          <ul style={{ margin: 0, paddingLeft: 20, maxWidth: "80ch" }}>
            {c.left_out.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => <li key={i} style={{ margin: "4px 0" }}>{l}</li>)}
          </ul>
        </div>
      )}

      {(c.limits.length > 0 || c.settlement.length > 0) && (
        <div className="grid2">
          {c.limits.length > 0 && (
            <div className="panel">
              <h2>Policy limits (per carrier estimate)</h2>
              <table>
                <tbody>{c.limits.map((l, i) => <tr key={i}><td>{l.label}</td><td className="r num">{usd(l.amount)}</td></tr>)}</tbody>
                <tfoot><tr><td>Total structure-related limits</td><td className="r num">{usd(t.limits)}</td></tr></tfoot>
              </table>
            </div>
          )}
          {c.settlement.length > 0 && (
            <div className="panel">
              <h2>Carrier settlement{c.settlement_date ? ` — ${fdate(c.settlement_date)}` : ""}</h2>
              <table>
                <tbody>{c.settlement.map((l, i) => <tr key={i}><td>{l.label}</td><td className="r num">{usd(l.amount)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <p className="note">TCB market figures are TCB&rsquo;s estimate of current Pacific Palisades post-fire pricing for the carrier&rsquo;s scope. They are a comparison basis for the claim, not a contract price; the construction contract and change orders remain under Budget &amp; billing and Change orders.</p>
    </>
  );
}
