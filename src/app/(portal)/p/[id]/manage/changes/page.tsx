import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { signed, fshort } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { Pill } from "@/components/Pill";
import { saveChangeOrder, deleteRow } from "../actions";
import { CoDrafter } from "./CoDrafter";

export const metadata = { title: "Change orders" };

export default async function ManageChanges({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const save = saveChangeOrder.bind(null, id);

  return (
    <>
      <div><h1>Change orders</h1><p className="sub">Give Claude the rough facts, it writes the client-facing description, and you send it for approval. The client approves or declines on their side.</p></div>
      <div className="panel">
        <h2>New change order</h2>
        <AdminForm action={save} submit="Send to client for approval" reset>
          <CoDrafter projectId={id} />
        </AdminForm>
      </div>
      <div className="panel">
        <h2>All change orders</h2>
        {r.changeOrders.length === 0 && <p className="note" style={{ margin: 0 }}>None yet.</p>}
        {[...r.changeOrders].reverse().map((c) => (
          <details className="panel" key={c.id} style={{ marginBottom: 8 }}>
            <summary>{c.code} · {c.title} · {signed(c.amount)} <Pill kind={c.status === "approved" ? "good" : c.status === "declined" ? "crit" : "warn"}>{c.status}{c.decided_date ? ` ${fshort(c.decided_date)}` : ""}</Pill></summary>
            <AdminForm action={save} submit="Save changes">
              <input type="hidden" name="co_id" value={c.id} />
              <div className="grid2">
                <div><label style={{ marginTop: 0 }}>Code</label><input name="code" type="text" defaultValue={c.code} /></div>
                <div><label style={{ marginTop: 0 }}>Title</label><input name="title" type="text" defaultValue={c.title} required /></div>
                <div><label>Amount</label><input name="amount" type="text" inputMode="decimal" defaultValue={String(c.amount)} /></div>
                <div><label>Sent</label><input name="sent_date" type="date" defaultValue={c.sent_date} /></div>
                <div><label>Status (override if signed on paper)</label><select name="status" defaultValue={c.status}><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option></select></div>
                <div><label>Decided date</label><input name="decided_date" type="date" defaultValue={c.decided_date ?? ""} /></div>
              </div>
              <label>Description</label>
              <textarea name="description" defaultValue={c.description} required />
            </AdminForm>
            <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "change_orders", c.id)} /></div>
          </details>
        ))}
      </div>
    </>
  );
}
