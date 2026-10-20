import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fdate, fshort, todayISO } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { Pill } from "@/components/Pill";
import { Gantt } from "@/components/Gantt";
import { groupByPhase, isMilestone, statusLabel } from "@/lib/schedule";
import { saveTask, savePhase, deleteRow, importSchedule } from "../actions";
import { TaskButtons } from "./TaskButtons";
import type { Phase, ScheduleTask } from "@/lib/types";

export const metadata = { title: "Schedule" };

function TaskForm({ id, phases, t, defaultPhase }: { id: string; phases: Phase[]; t?: ScheduleTask; defaultPhase?: string }) {
  const save = saveTask.bind(null, id);
  return (
    <AdminForm action={save} submit={t ? "Save" : "Add task"} reset={!t}>
      {t && <input type="hidden" name="task_id" value={t.id} />}
      <div className="grid2">
        <div style={{ gridColumn: "1 / -1" }}><label style={{ marginTop: 0 }}>Task</label><input name="title" type="text" defaultValue={t?.title ?? ""} required placeholder="Pour footings, grade beams & stem walls" /></div>
        <div><label>Phase</label>
          <select name="phase_id" defaultValue={t?.phase_id ?? defaultPhase ?? ""}>
            <option value="">— none —</option>
            {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label>Assigned to (sub / vendor)</label><input name="assigned_to" type="text" defaultValue={t?.assigned_to ?? ""} placeholder="Concrete Sub" /></div>
        <div><label>Start</label><input name="start_date" type="date" defaultValue={t?.start_date ?? todayISO()} required /></div>
        <div><label>Finish</label><input name="end_date" type="date" defaultValue={t?.end_date ?? ""} /></div>
        <div><label>Work days (blank = count Mon–Fri)</label><input name="duration_days" type="number" min={0} defaultValue={t ? t.duration_days : ""} /></div>
        <div><label>Status</label>
          <select name="status" defaultValue={t?.status ?? "planned"}><option value="planned">Upcoming</option><option value="in_progress">In progress</option><option value="complete">Complete</option></select>
        </div>
        <div><label>Cost code (SOV)</label><input name="cost_code" type="text" defaultValue={t?.cost_code ?? ""} placeholder="2115" /></div>
        <div><label>Order (blank = by date)</label><input name="sort_order" type="number" defaultValue={t ? t.sort_order : ""} /></div>
        <div><label>Predecessor(s)</label><input name="predecessors" type="text" defaultValue={t?.predecessors ?? ""} placeholder="Strip Forms & Cure; Inspection - …" /></div>
        <div className="grid2" style={{ gap: 8 }}>
          <div><label>Type</label><input name="predecessor_type" type="text" defaultValue={t?.predecessor_type ?? ""} placeholder="FS; SS" /></div>
          <div><label>Lag (days)</label><input name="lag_days" type="text" defaultValue={t?.lag_days ?? ""} placeholder="0; 2" /></div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}><label>Notes (the client sees these)</label><input name="notes" type="text" defaultValue={t?.notes ?? ""} /></div>
        <div><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input name="show_client" type="checkbox" defaultChecked={t ? t.show_client : true} style={{ width: "auto" }} /> Show on client portal</label></div>
        <div><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input name="milestone" type="checkbox" defaultChecked={t ? isMilestone(t) : false} style={{ width: "auto" }} /> Milestone (zero-day marker)</label></div>
      </div>
    </AdminForm>
  );
}

export default async function ManageSchedule({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const groups = groupByPhase(r.phases, r.tasks);
  const phase = savePhase.bind(null, id), imp = importSchedule.bind(null, id);

  return (
    <>
      <div className="row nt" style={{ alignItems: "flex-end" }}>
        <div className="grow"><h1>Schedule</h1><p className="sub">Phases and the tasks under them. Clients see everything except rows you mark hidden; phase dates and % follow the tasks automatically.</p></div>
        <div className="btns">
          <a className="btn sm" href={`/p/${id}/schedule/gantt.pdf`}>Gantt PDF</a>
          <a className="btn ghost sm" href={`/p/${id}/schedule/schedule.csv`}>Buildertrend CSV</a>
          <a className="btn ghost sm" href={`/p/${id}/schedule/schedule.csv?format=client`}>Client CSV</a>
          <Link className="btn ghost sm" href={`/p/${id}/schedule`}>Client view</Link>
        </div>
      </div>

      {r.tasks.length > 0 && <div className="panel"><Gantt groups={groups} showHidden /></div>}

      {groups.map((g) => (
        <div className="panel" key={g.phase?.id ?? "none"}>
          <div className="row nt">
            <div className="grow"><h2 style={{ margin: 0 }}>{g.phase?.name ?? "Tasks without a phase"}</h2>{g.tasks.length > 0 && <div className="d" style={{ fontSize: 13, color: "var(--muted)" }}>{fdate(g.start)} – {fdate(g.end)} · {g.tasks.length} tasks</div>}</div>
            <Pill kind={g.percent === 100 ? "good" : g.percent > 0 ? "info" : "idle"}>{g.percent}%</Pill>
          </div>
          {g.tasks.length > 0 && (
            <div className="scroll">
              <table>
                <thead><tr><th>Task</th><th>Start</th><th>Finish</th><th className="r">Days</th><th>Who</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {g.tasks.map((t) => {
                    const s = statusLabel(t.status, t.end_date);
                    return (
                      <tr key={t.id} style={!t.show_client ? { opacity: 0.65 } : undefined}>
                        <td>
                          <details>
                            <summary style={{ cursor: "pointer" }}>{isMilestone(t) ? "◆ " : ""}{t.title}{!t.show_client && <span className="pill idle" style={{ marginLeft: 8 }}>Hidden</span>}</summary>
                            <div style={{ marginTop: 8, padding: 10, background: "var(--sunk)" }}><TaskForm id={id} phases={r.phases} t={t} /></div>
                          </details>
                        </td>
                        <td className="num">{fshort(t.start_date)}</td><td className="num">{fshort(t.end_date)}</td>
                        <td className="num r">{isMilestone(t) ? "—" : t.duration_days}</td>
                        <td style={{ fontSize: 13 }}>{t.assigned_to || "—"}</td>
                        <td><Pill kind={s.tone}>{s.label}</Pill></td>
                        <td><TaskButtons projectId={id} taskId={t.id} status={t.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <details className="panel" style={{ marginTop: 10 }}>
            <summary>Add a task to this phase</summary>
            <TaskForm id={id} phases={r.phases} defaultPhase={g.phase?.id} />
          </details>
          {g.phase && (
            <details className="panel" style={{ marginTop: 8 }}>
              <summary>Rename / reorder phase</summary>
              <AdminForm action={phase} submit="Save">
                <input type="hidden" name="phase_id" value={g.phase.id} />
                <input type="hidden" name="start_date" value={g.phase.start_date} /><input type="hidden" name="end_date" value={g.phase.end_date} /><input type="hidden" name="percent_complete" value={g.phase.percent_complete} />
                <div className="grid2">
                  <div><label style={{ marginTop: 0 }}>Phase</label><input name="name" type="text" defaultValue={g.phase.name} required /></div>
                  <div><label style={{ marginTop: 0 }}>Order</label><input name="sort_order" type="number" defaultValue={g.phase.sort_order} /></div>
                </div>
              </AdminForm>
              <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteRow.bind(null, id, "phases", g.phase.id)} label="Delete phase (tasks are kept)" /></div>
            </details>
          )}
        </div>
      ))}

      <div className="panel">
        <h2>Add a phase</h2>
        <AdminForm action={phase} submit="Add phase" reset>
          <div className="grid2">
            <div><label style={{ marginTop: 0 }}>Phase</label><input name="name" type="text" required placeholder="Structural CMU walls" /></div>
            <div><label style={{ marginTop: 0 }}>Order</label><input name="sort_order" type="number" defaultValue={r.phases.length + 1} /></div>
            <div><label>Start</label><input name="start_date" type="date" defaultValue={todayISO()} required /></div>
            <div><label>Finish</label><input name="end_date" type="date" defaultValue={todayISO()} required /></div>
            <input type="hidden" name="percent_complete" value={0} />
          </div>
          <p className="note">Dates update from the tasks you add under it.</p>
        </AdminForm>
      </div>

      <div className="panel">
        <h2>Import from a spreadsheet</h2>
        <p className="sub" style={{ marginBottom: 10 }}>Buildertrend &ldquo;Schedule Import&rdquo; layout (Title, Start Date, End Date, Duration, Phase, Cost Code, Assigned To, Predecessor…) or the CSV this portal exports. Save the sheet as CSV first. Phases are created by name when they don&rsquo;t exist yet.</p>
        <AdminForm action={imp} submit="Import" reset>
          <input name="file" type="file" accept=".csv,text/csv" required />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input name="replace" type="checkbox" style={{ width: "auto" }} /> Replace the existing tasks on this job</label>
        </AdminForm>
      </div>
    </>
  );
}
