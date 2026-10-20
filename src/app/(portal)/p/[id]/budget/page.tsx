import { notFound } from "next/navigation";
import { getJobRecord, getViewer, approvedTotal, billedTotal, revisedContract } from "@/lib/data";
import { usd, signed, fdate, sum } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { signPayAppDocs } from "@/lib/payapp-docs";

export const metadata = { title: "Budget & billing" };

export default async function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { supabase }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  const docs = await signPayAppDocs(supabase, r.payApps);
  const tb = sum(r.budget, (b) => b.budget), tl = billedTotal(r), revised = revisedContract(r);
  return (
    <>
      <div><h1>Budget &amp; billing</h1><p className="sub">Contract amounts against what has been billed. Lien waivers from TCB and each subcontractor are attached to every pay application.</p></div>
      <div className="stats">
        <div className="stat"><span>Original contract</span><b>{usd(r.project.contract_amount)}</b></div>
        <div className="stat"><span>Approved change orders</span><b>{signed(approvedTotal(r))}</b></div>
        <div className="stat"><span>Revised contract</span><b>{usd(revised)}</b></div>
        <div className="stat"><span>Remaining to bill</span><b>{usd(revised - tl)}</b></div>
      </div>
      <div className="panel scroll">
        <h2>Budget by category</h2>
        {r.budget.length === 0 ? <p className="note" style={{ margin: 0 }}>The budget breakdown will appear here once it&rsquo;s posted.</p> : (
          <table>
            <thead><tr><th>Category</th><th className="r">Budget</th><th className="r">Billed</th><th className="r">Remaining</th><th></th><th className="r">Billed %</th></tr></thead>
            <tbody>
              {r.budget.map((b) => {
                const p = Number(b.budget) > 0 ? Math.round((Number(b.billed) / Number(b.budget)) * 100) : 0;
                return (
                  <tr key={b.id}>
                    <td>{b.category}</td><td className="r num">{usd(b.budget)}</td><td className="r num">{usd(b.billed)}</td><td className="r num">{usd(Number(b.budget) - Number(b.billed))}</td>
                    <td style={{ paddingLeft: 14 }}><div className="bar"><i style={{ width: `${Math.min(p, 100)}%` }} /></div></td><td className="r num">{p}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td><td className="r num">{usd(tb)}</td><td className="r num">{usd(tl)}</td><td className="r num">{usd(tb - tl)}</td><td></td><td className="r num">{tb > 0 ? Math.round((tl / tb) * 100) : 0}%</td></tr></tfoot>
          </table>
        )}
      </div>
      <div className="panel scroll">
        <h2>Pay applications</h2>
        {r.payApps.length === 0 ? <p className="note" style={{ margin: 0 }}>No pay applications yet.</p> : (
          <table>
            <thead><tr><th>No.</th><th>Period</th><th className="r">Amount</th><th>Status</th><th>Documents</th></tr></thead>
            <tbody>
              {r.payApps.map((p) => {
                const links = docs.get(p.id) ?? [];
                return (
                  <tr key={p.id}>
                    <td className="num">#{p.number}</td>
                    <td>Period ending {fdate(p.period_ending)}{p.waiver_note && <div className="d" style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.waiver_note}</div>}</td>
                    <td className="r num">{usd(p.amount)}</td>
                    <td>{p.status === "paid" ? <Pill kind="good">Paid{p.status_date ? ` ${fdate(p.status_date, { month: "short", day: "numeric" })}` : ""}</Pill> : <Pill kind="warn">Due{p.status_date ? ` ${fdate(p.status_date, { month: "short", day: "numeric" })}` : ""}</Pill>}</td>
                    <td>
                      {links.length === 0 ? <span className="note" style={{ margin: 0 }}>Not uploaded yet</span> : (
                        <div className="btns" style={{ gap: 6 }}>
                          {links.map((l) => <a key={l.label} className="btn ghost sm" href={l.url} target="_blank" rel="noopener">{l.label} (PDF)</a>)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>Total invoiced</td><td className="r num">{usd(sum(r.payApps, (p) => p.amount))}</td><td colSpan={2}>{usd(sum(r.payApps.filter((p) => p.status === "paid"), (p) => p.amount))} paid · {usd(sum(r.payApps.filter((p) => p.status === "due"), (p) => p.amount))} outstanding</td></tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
