import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fdate } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { saveProject, savePhase, deleteRow } from "../actions";

export const metadata = { title: "Job settings" };

export default async function Settings({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const p = r.project;
  const save = saveProject.bind(null, id), phase = savePhase.bind(null, id);

  return (
    <>
      <div><h1>Job settings</h1><p className="sub">The header, contract figure and schedule phases the client sees.</p></div>
      <div className="panel">
        <h2>Job</h2>
        <AdminForm action={save} submit="Save">
          <div className="grid2">
            <div><label style={{ marginTop: 0 }}>Job name</label><input name="name" type="text" defaultValue={p.name} required /></div>
            <div><label style={{ marginTop: 0 }}>Clients (as shown)</label><input name="client_names" type="text" defaultValue={p.client_names} placeholder="Dana & Chris Hartwell" /></div>
            <div><label>Address</label><input name="address" type="text" defaultValue={p.address} /></div>
            <div><label>Description</label><input name="description" type="text" defaultValue={p.description} placeholder="New custom residence, 6,400 sq ft" /></div>
            <div><label>Original contract (USD)</label><input name="contract_amount" type="text" inputMode="decimal" defaultValue={String(p.contract_amount)} /></div>
            <div><label>Target completion</label><input name="target_completion" type="date" defaultValue={p.target_completion ?? ""} /></div>
            <div><label>Current phase</label><input name="current_phase" type="text" defaultValue={p.current_phase} placeholder="Roofing, windows and rough MEP" /></div>
            <div><label>Schedule status</label><input name="schedule_status" type="text" defaultValue={p.schedule_status} placeholder="On track" /></div>
            <div><label>Schedule note</label><input name="schedule_note" type="text" defaultValue={p.schedule_note} placeholder="Weather-tight by Oct 30" /></div>
            <div><label>Archived (hide from lists)</label><input name="archived" type="checkbox" defaultChecked={p.archived} style={{ width: "auto" }} /></div>
          </div>
        </AdminForm>
      </div>

      <div className="panel">
        <h2>Schedule phases</h2>
        <p className="sub" style={{ marginBottom: 10 }}>Tasks under each phase live on the <a href={`/p/${id}/manage/schedule`}>Schedule</a> page; phase dates and % follow those tasks when there are any.</p>
        {r.phases.map((ph) => (
          <details className="panel" key={ph.id} style={{ marginBottom: 8 }}>
            <summary>{ph.name} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {fdate(ph.start_date)} to {fdate(ph.end_date)}, {ph.percent_complete}%</span></summary>
            <AdminForm action={phase} submit="Save">
              <input type="hidden" name="phase_id" value={ph.id} />
              <div className="grid2">
                <div><label style={{ marginTop: 0 }}>Phase</label><input name="name" type="text" defaultValue={ph.name} required /></div>
                <div><label style={{ marginTop: 0 }}>Order</label><input name="sort_order" type="number" defaultValue={ph.sort_order} /></div>
                <div><label>Start</label><input name="start_date" type="date" defaultValue={ph.start_date} required /></div>
                <div><label>Finish</label><input name="end_date" type="date" defaultValue={ph.end_date} required /></div>
                <div><label>% complete</label><input name="percent_complete" type="number" min={0} max={100} defaultValue={ph.percent_complete} /></div>
              </div>
            </AdminForm>
            <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "phases", ph.id)} /></div>
          </details>
        ))}
        <details className="panel" open={r.phases.length === 0}>
          <summary>Add a phase</summary>
          <AdminForm action={phase} submit="Add" reset>
            <div className="grid2">
              <div><label style={{ marginTop: 0 }}>Phase</label><input name="name" type="text" placeholder="Framing" required /></div>
              <div><label style={{ marginTop: 0 }}>Order</label><input name="sort_order" type="number" defaultValue={r.phases.length + 1} /></div>
              <div><label>Start</label><input name="start_date" type="date" required /></div>
              <div><label>Finish</label><input name="end_date" type="date" required /></div>
              <div><label>% complete</label><input name="percent_complete" type="number" min={0} max={100} defaultValue={0} /></div>
            </div>
          </AdminForm>
        </details>
      </div>
    </>
  );
}
