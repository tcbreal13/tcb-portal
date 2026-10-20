import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { usd, fdate, sum } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { saveBudgetLine, savePayApp, deleteRow } from "../actions";
import { PAYAPP_DOCS } from "@/lib/types";
import { signPayAppDocs } from "@/lib/payapp-docs";
import { OpenHashDetails } from "@/components/OpenHashDetails";

export const metadata = { title: "Budget & pay apps" };

export default async function ManageBudget({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const docs = await signPayAppDocs(supabase, r.payApps);
  const saveLine = saveBudgetLine.bind(null, id), savePA = savePayApp.bind(null, id);
  const nextNo = (r.payApps.at(-1)?.number ?? 0) + 1;

  return (
    <>
      <OpenHashDetails />
      <div><h1>Budget &amp; pay apps</h1><p className="sub">Update the billed amount on each category when you issue a pay app; the client&rsquo;s totals follow.</p></div>

      <div className="stats">
        <div className="stat"><span>Budget total ({r.budget.length} lines)</span><b>{usd(sum(r.budget, (b) => b.budget))}</b></div>
        <div className="stat"><span>Billed to date</span><b>{usd(sum(r.budget, (b) => b.billed))}</b><span>{sum(r.budget, (b) => b.budget) > 0 ? Math.round((sum(r.budget, (b) => b.billed) / sum(r.budget, (b) => b.budget)) * 100) : 0}% of budget</span></div>
        <div className="stat"><span>Remaining</span><b>{usd(sum(r.budget, (b) => b.budget) - sum(r.budget, (b) => b.billed))}</b></div>
        <div className="stat"><span>Pay apps issued</span><b>{usd(sum(r.payApps, (p) => p.amount))}</b><span>{r.payApps.filter((p) => p.status === "due").length} open · {usd(sum(r.payApps.filter((p) => p.status === "due"), (p) => p.amount))} outstanding</span></div>
      </div>

      <div className="panel">
        <h2>Budget by category</h2>
        {r.budget.map((b) => (
          <details className="panel" key={b.id} style={{ marginBottom: 8 }}>
            <summary>{b.category} <span className="num" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {usd(b.billed)} of {usd(b.budget)}</span></summary>
            <AdminForm action={saveLine} submit="Save">
              <input type="hidden" name="line_id" value={b.id} />
              <div className="grid2">
                <div><label>Category</label><input name="category" type="text" defaultValue={b.category} required /></div>
                <div><label>Order</label><input name="sort_order" type="number" defaultValue={b.sort_order} /></div>
                <div><label>Budget</label><input name="budget" type="text" inputMode="decimal" defaultValue={String(b.budget)} /></div>
                <div><label>Billed to date</label><input name="billed" type="text" inputMode="decimal" defaultValue={String(b.billed)} /></div>
              </div>
            </AdminForm>
            <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "budget_lines", b.id)} /></div>
          </details>
        ))}
        {r.budget.length > 0 && (
          <div className="row" style={{ borderTop: "2px solid var(--ink)", marginTop: 4, paddingTop: 10, fontWeight: 700 }}>
            <div className="grow">Total — {r.budget.length} categories</div>
            <span className="num">{usd(sum(r.budget, (b) => b.billed))} billed of {usd(sum(r.budget, (b) => b.budget))} · {usd(sum(r.budget, (b) => b.budget) - sum(r.budget, (b) => b.billed))} remaining</span>
          </div>
        )}
        <details className="panel" open={r.budget.length === 0} style={{ marginTop: 12 }}>
          <summary>Add a category</summary>
          <AdminForm action={saveLine} submit="Add" reset>
            <div className="grid2">
              <div><label>Category</label><input name="category" type="text" placeholder="Framing & structural steel" required /></div>
              <div><label>Order</label><input name="sort_order" type="number" defaultValue={r.budget.length + 1} /></div>
              <div><label>Budget</label><input name="budget" type="text" inputMode="decimal" placeholder="610000" /></div>
              <div><label>Billed to date</label><input name="billed" type="text" inputMode="decimal" placeholder="0" /></div>
            </div>
          </AdminForm>
        </details>
      </div>

      <div className="panel">
        <h2>Pay applications</h2>
        {r.payApps.map((p) => (
          <details className="panel" key={p.id} id={`pa-${p.number}`} style={{ marginBottom: 8 }}>
            <summary>#{p.number} · period ending {fdate(p.period_ending)} · {usd(p.amount)} · {p.status}{(docs.get(p.id)?.length ?? 0) > 0 && <span className="pill good" style={{ marginLeft: 8 }}>{docs.get(p.id)!.length} PDF{docs.get(p.id)!.length === 1 ? "" : "s"}</span>}</summary>
            <AdminForm action={savePA} submit="Save">
              <input type="hidden" name="pa_id" value={p.id} />
              <div className="grid2">
                <div><label>Number</label><input name="number" type="number" defaultValue={p.number} required /></div>
                <div><label>Period ending</label><input name="period_ending" type="date" defaultValue={p.period_ending} required /></div>
                <div><label>Amount</label><input name="amount" type="text" inputMode="decimal" defaultValue={String(p.amount)} /></div>
                <div><label>Status</label><select name="status" defaultValue={p.status}><option value="due">Due</option><option value="paid">Paid</option></select></div>
                <div><label>Due / paid date</label><input name="status_date" type="date" defaultValue={p.status_date ?? ""} /></div>
                <div><label>Note (shown to client)</label><input name="waiver_note" type="text" defaultValue={p.waiver_note} placeholder="INV 1517 — grading and retaining wall" /></div>
              </div>
              <div className="eyebrow" style={{ marginTop: 14 }}>Documents (PDF)</div>
              <div className="grid2">
                {PAYAPP_DOCS.map(([col, label, slug]) => {
                  const link = (docs.get(p.id) ?? []).find((l) => l.label === label);
                  return (
                    <div key={slug}>
                      <label>{label}{link && <> · <a href={link.url} target="_blank" rel="noopener" className="linkbtn">open current</a></>}</label>
                      <input name={`doc_${slug}`} type="file" accept="application/pdf,image/*" />
                      {p[col] && <span className="note" style={{ display: "block" }}><input type="checkbox" name={`remove_${slug}`} style={{ width: "auto", marginRight: 6 }} />Remove current file</span>}
                    </div>
                  );
                })}
              </div>
            </AdminForm>
            <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "pay_apps", p.id)} /></div>
          </details>
        ))}
        {r.payApps.length > 0 && (
          <div className="row" style={{ borderTop: "2px solid var(--ink)", marginTop: 4, paddingTop: 10, fontWeight: 700 }}>
            <div className="grow">Total — {r.payApps.length} pay apps</div>
            <span className="num">{usd(sum(r.payApps, (p) => p.amount))} invoiced · {usd(sum(r.payApps.filter((p) => p.status === "paid"), (p) => p.amount))} paid · {usd(sum(r.payApps.filter((p) => p.status === "due"), (p) => p.amount))} outstanding</span>
          </div>
        )}
        <details className="panel" open={r.payApps.length === 0} style={{ marginTop: 12 }}>
          <summary>Add pay application #{nextNo}</summary>
          <AdminForm action={savePA} submit="Add" reset>
            <div className="grid2">
              <div><label>Number</label><input name="number" type="number" defaultValue={nextNo} required /></div>
              <div><label>Period ending</label><input name="period_ending" type="date" required /></div>
              <div><label>Amount</label><input name="amount" type="text" inputMode="decimal" placeholder="289000" /></div>
              <div><label>Status</label><select name="status" defaultValue="due"><option value="due">Due</option><option value="paid">Paid</option></select></div>
              <div><label>Due / paid date</label><input name="status_date" type="date" /></div>
              <div><label>Note (shown to client)</label><input name="waiver_note" type="text" placeholder="INV 1520 — foundation and slab" /></div>
            </div>
            <div className="eyebrow" style={{ marginTop: 14 }}>Documents (PDF)</div>
            <div className="grid2">
              {PAYAPP_DOCS.map(([, label, slug]) => (
                <div key={slug}><label>{label}</label><input name={`doc_${slug}`} type="file" accept="application/pdf,image/*" /></div>
              ))}
            </div>
            <p className="note">Attach what you have now; you can add the unconditional waiver later once the payment clears.</p>
          </AdminForm>
        </details>
      </div>
    </>
  );
}
