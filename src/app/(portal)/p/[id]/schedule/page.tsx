import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobRecord, getViewer } from "@/lib/data";
import { fdate, fshort } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { Gantt } from "@/components/Gantt";
import { groupByPhase, isMilestone, statusLabel, visibleTasks, todayMs, toMs, workDays } from "@/lib/schedule";

export const metadata = { title: "Schedule" };

export default async function Schedule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { profile }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  const isBuilder = profile.role === "builder";
  const tasks = visibleTasks(r, isBuilder);
  const groups = groupByPhase(r.phases, tasks);
  const all = groups.flatMap((g) => g.tasks);
  const now = todayMs();
  const inProgress = all.filter((t) => t.status === "in_progress");
  const nextUp = all.filter((t) => t.status === "planned" && toMs(t.start_date) >= now).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 4);
  const milestones = all.filter(isMilestone);
  const finish = all.length ? all.reduce((m, t) => (t.end_date > m ? t.end_date : m), all[0].end_date) : null;
  const done = all.filter((t) => t.status === "complete").length;

  return (
    <>
      <div className="row nt" style={{ alignItems: "flex-end" }}>
        <div className="grow">
          <h1>Schedule</h1>
          <p className="sub">
            {r.project.target_completion ? `Target completion ${fdate(r.project.target_completion)}.` : finish ? `Current plan runs through ${fdate(finish)}.` : "Target completion to be set."}
            {r.project.schedule_note ? ` ${r.project.schedule_note}` : ""}
          </p>
        </div>
        {all.length > 0 && (
          <div className="btns">
            <a className="btn sm" href={`/p/${id}/schedule/gantt.pdf`}>Download Gantt (PDF)</a>
            <a className="btn ghost sm" href={`/p/${id}/schedule/schedule.csv`}>Download CSV</a>
            {isBuilder && <Link className="btn ghost sm" href={`/p/${id}/manage/schedule`}>Edit schedule</Link>}
          </div>
        )}
      </div>

      {all.length > 0 && (
        <div className="stats">
          <div className="stat"><span>Tasks complete</span><b>{done} <span style={{ fontSize: 14 }}>of {all.length}</span></b></div>
          <div className="stat"><span>On site now</span><b style={{ fontSize: 15 }}>{inProgress.length ? inProgress.map((t) => t.title).join(" · ") : "Between tasks"}</b></div>
          <div className="stat"><span>Next up</span><b style={{ fontSize: 15 }}>{nextUp[0] ? `${nextUp[0].title} — ${fshort(nextUp[0].start_date)}` : "—"}</b></div>
          <div className="stat"><span>{r.project.schedule_status || "Status"}</span><b style={{ fontSize: 15 }}>{finish ? `Plan runs to ${fshort(finish)}` : "—"}</b></div>
        </div>
      )}

      {all.length > 0 ? (
        <div className="panel">
          <div className="row nt"><h2 className="grow" style={{ margin: 0 }}>Gantt</h2>
            <span className="legend"><i style={{ background: "var(--good)" }} /> Complete <i style={{ background: "var(--accent)" }} /> In progress <i style={{ background: "var(--surface)", border: "1px solid var(--ink)" }} /> Upcoming <i className="dia" /> Milestone</span>
          </div>
          <Gantt groups={groups} showHidden={isBuilder} />
          <p className="note">Bars are working days, Monday to Friday; grey columns are weekends. Hover a row for dates and the trade responsible.</p>
        </div>
      ) : (
        <div className="panel"><p className="note" style={{ margin: 0 }}>The detailed schedule will appear here once it&rsquo;s posted.</p></div>
      )}

      {milestones.length > 0 && (
        <div className="panel">
          <h2>Milestones</h2>
          <div className="rows">
            {milestones.map((m) => (
              <div className="row" key={m.id}>
                <div className="grow"><div className="t">{m.title}</div><div className="d">{fdate(m.start_date)}</div></div>
                <Pill kind={statusLabel(m.status, m.end_date).tone}>{statusLabel(m.status, m.end_date).label}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => g.tasks.length > 0 && (
        <div className="panel scroll" key={g.phase?.id ?? "other"}>
          <div className="row nt">
            <div className="grow"><h2 style={{ margin: 0 }}>{g.phase?.name ?? "Other"}</h2><div className="d" style={{ fontSize: 13, color: "var(--muted)" }}>{fdate(g.start)} – {fdate(g.end)} · {workDays(g.start, g.end)} working days</div></div>
            <Pill kind={g.percent === 100 ? "good" : g.percent > 0 ? "info" : "idle"}>{g.percent === 100 ? "Complete" : g.percent > 0 ? `${g.percent}% complete` : "Upcoming"}</Pill>
          </div>
          <table>
            <thead><tr><th>Task</th><th>Start</th><th>Finish</th><th className="r">Days</th><th>Who</th><th>Status</th></tr></thead>
            <tbody>
              {g.tasks.map((t) => {
                const s = statusLabel(t.status, t.end_date);
                return (
                  <tr key={t.id} style={!t.show_client ? { opacity: 0.6 } : undefined}>
                    <td>{isMilestone(t) && <span title="Milestone" style={{ display: "inline-block", width: 8, height: 8, background: "var(--ink)", transform: "rotate(45deg)", marginRight: 8 }} />}{t.title}{!t.show_client && <span className="pill idle" style={{ marginLeft: 8 }}>Hidden from client</span>}{t.notes && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.notes}</div>}</td>
                    <td className="num">{fshort(t.start_date)}</td><td className="num">{fshort(t.end_date)}</td>
                    <td className="num r">{isMilestone(t) ? "—" : t.duration_days}</td>
                    <td>{t.assigned_to || "—"}</td>
                    <td><Pill kind={s.tone}>{s.label}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
