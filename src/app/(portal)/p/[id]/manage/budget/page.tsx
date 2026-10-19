import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { usd, fdate } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { saveBudgetLine, savePayApp, deleteRow } from "../actions";

export const metadata = { title: "Budget & pay apps" };

export default async function ManageBudget({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const saveLine = saveBudgetLine.bind(null, id), savePA = savePayApp.bind(null, id);
  const nextNo = (r.payApps.at(-1)?.number ?? 0) + 1;

  return (
    <>
      <div><h1>Budget &amp; pay apps</h1><p className="sub">Update the billed amount on each category when you issue a pay app; the client&rsquo;s totals follow.</p></div>

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
        <details className="panel" open={r.budget.length === 0}>
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
          <details className="panel" key={p.id} style={{ marginBottom: 8 }}>
            <summary>#{p.number} · period ending {fdate(p.period_ending)} · {usd(p.amount)} · {p.status}</summary>
            <AdminForm action={savePA} submit="Save">
              <input type="hidden" name="pa_id" value={p.id} />
              <div className="grid2">
                <div><label>Number</label><input name="number" type="number" defaultValue={p.number} required /></div>
                <div><label>Period ending</label><input name="period_ending" type="date" defaultValue={p.period_ending} required /></div>
                <div><label>Amount</label><input name="amount" type="text" inputMode="decimal" defaultValue={String(p.amount)} /></div>
                <div><label>Status</label><select name="status" defaultValue={p.status}><option value="due">Due</option><option value="paid">Paid</option></select></div>
                <div><label>Due / paid date</label><input name="status_date" type="date" defaultValue={p.status_date ?? ""} /></div>
                <div><label>Lien waiver note</label><input name="waiver_note" type="text" defaultValue={p.waiver_note} placeholder="Conditional waivers attached" /></div>
              </div>
            </AdminForm>
            <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "pay_apps", p.id)} /></div>
          </details>
        ))}
        <details className="panel" open={r.payApps.length === 0}>
          <summary>Add pay application #{nextNo}</summary>
          <AdminForm action={savePA} submit="Add" reset>
            <div className="grid2">
              <div><label>Number</label><input name="number" type="number" defaultValue={nextNo} required /></div>
              <div><label>Period ending</label><input name="period_ending" type="date" required /></div>
              <div><label>Amount</label><input name="amount" type="text" inputMode="decimal" placeholder="289000" /></div>
              <div><label>Status</label><select name="status" defaultValue="due"><option value="due">Due</option><option value="paid">Paid</option></select></div>
              <div><label>Due / paid date</label><input name="status_date" type="date" /></div>
              <div><label>Lien waiver note</label><input name="waiver_note" type="text" placeholder="Conditional waivers attached" /></div>
            </div>
            <p className="note">Upload the pay app PDF and waivers under Documents so the client can open them.</p>
          </AdminForm>
        </details>
      </div>
    </>
  );
}
