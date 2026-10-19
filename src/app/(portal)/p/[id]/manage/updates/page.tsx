import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fdate, todayISO } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { postUpdate, deleteRow } from "../actions";
import { UpdateDrafter } from "./UpdateDrafter";

export const metadata = { title: "Weekly update" };

export default async function ManageUpdates({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const post = postUpdate.bind(null, id);
  return (
    <>
      <div><h1>Weekly update</h1><p className="sub">Claude drafts the client update from this week&rsquo;s daily logs and open items. Nothing posts until you approve it.</p></div>
      <div className="panel">
        <AdminForm action={post} submit="Approve and post to client" reset>
          <UpdateDrafter projectId={id} />
          <label htmlFor="update_date">Date</label>
          <input id="update_date" name="update_date" type="date" defaultValue={todayISO()} style={{ maxWidth: 220 }} />
        </AdminForm>
      </div>
      <div className="panel">
        <h2>Past updates</h2>
        {r.updates.length === 0 && <p className="note" style={{ margin: 0 }}>None yet.</p>}
        {r.updates.map((u) => (
          <details className="panel" key={u.id} style={{ marginBottom: 8 }}>
            <summary>{fdate(u.update_date)}</summary>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{u.body}</p>
            <div style={{ marginTop: 10 }}><DeleteButton onDelete={deleteRow.bind(null, id, "updates", u.id)} /></div>
          </details>
        ))}
      </div>
    </>
  );
}
