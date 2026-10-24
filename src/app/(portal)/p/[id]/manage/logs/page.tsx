import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fweekday, todayISO } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { FileDrop } from "@/components/FileDrop";
import { postDailyLog, addLookahead, deleteRow } from "../actions";

export const metadata = { title: "Post a daily log" };

export default async function ManageLogs({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const post = postDailyLog.bind(null, id), addLA = addLookahead.bind(null, id);
  const today = todayISO();
  const ahead = r.lookahead.filter((l) => l.item_date >= today);

  return (
    <>
      <div><h1>Post a daily log</h1><p className="sub">A few sentences and a handful of photos from your phone is plenty. Clients read these more than anything else.</p></div>
      <div className="panel">
        <AdminForm action={post} submit="Post log" reset uploadTo={{ bucket: "photos", prefix: `${id}/logs` }}>
          <div className="grid2">
            <div><label htmlFor="log_date" style={{ marginTop: 0 }}>Date</label><input id="log_date" name="log_date" type="date" defaultValue={today} required /></div>
            <div><label htmlFor="weather" style={{ marginTop: 0 }}>Weather</label><input id="weather" name="weather" type="text" placeholder="Clear, 78°F" /></div>
          </div>
          <label htmlFor="crew">Crews on site</label>
          <input id="crew" name="crew" type="text" placeholder="Windows 4 · Roofing 5 · Plumbing 3" />
          <label htmlFor="note">What happened</label>
          <textarea id="note" name="note" required placeholder="Set 11 of 34 window units on the south elevation. Roofers finished underlayment on the main ridge…" />
          <label htmlFor="photos">Photos</label>
          <FileDrop name="photos" accept="image/*" label="Drop photos here, or tap to choose" />
          <p className="note">Up to 50 MB each. Phone photos work as they are — pick as many as you like.</p>
        </AdminForm>
      </div>

      <div className="panel">
        <h2>Coming up on site</h2>
        <p className="sub" style={{ marginBottom: 10 }}>Short look-ahead items the client sees on their Overview.</p>
        <div className="rows">
          {ahead.map((l) => (
            <div className="row" key={l.id}><span className="num" style={{ width: 96 }}>{fweekday(l.item_date)}</span><div className="grow">{l.body}</div>
              <DeleteButton onDelete={deleteRow.bind(null, id, "lookahead_items", l.id)} label="Remove" /></div>
          ))}
        </div>
        <AdminForm action={addLA} submit="Add" reset>
          <div className="grid2">
            <div><label htmlFor="item_date">Date</label><input id="item_date" name="item_date" type="date" required /></div>
            <div><label htmlFor="body">What</label><input id="body" name="body" type="text" placeholder="Rough plumbing top-out inspection (LADBS)" required /></div>
          </div>
        </AdminForm>
      </div>

      <div className="panel">
        <h2>Recent logs</h2>
        <div className="rows">
          {r.logs.slice(0, 15).map((l) => (
            <div className="row" key={l.id}>
              <div className="grow"><div className="t">{fweekday(l.log_date)}</div><div className="d">{l.note.slice(0, 140)}{l.note.length > 140 ? "…" : ""}{l.photos.length ? ` · ${l.photos.length} photo${l.photos.length === 1 ? "" : "s"}` : ""}</div></div>
              <DeleteButton onDelete={deleteRow.bind(null, id, "daily_logs", l.id)} />
            </div>
          ))}
          {r.logs.length === 0 && <p className="note" style={{ margin: 0 }}>No logs yet.</p>}
        </div>
      </div>
    </>
  );
}
