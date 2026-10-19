import { notFound } from "next/navigation";
import { getJobRecord } from "@/lib/data";
import { fdate } from "@/lib/format";
import { Pill } from "@/components/Pill";

export const metadata = { title: "Schedule" };

export default async function Schedule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const P = r.phases;

  let gantt: React.ReactNode = null;
  if (P.length) {
    const t0 = Math.min(...P.map((p) => new Date(p.start_date + "T00:00:00").getTime()));
    const t1 = Math.max(...P.map((p) => new Date(p.end_date + "T00:00:00").getTime()));
    const span = Math.max(t1 - t0, 1);
    const pos = (ms: number) => (((ms - t0) / span) * 100).toFixed(2);
    // Quarter ticks
    const ticks: { left: string; label: string }[] = [];
    const d = new Date(t0); d.setDate(1); d.setMonth(Math.floor(d.getMonth() / 3) * 3);
    while (d.getTime() <= t1) {
      if (d.getTime() >= t0) ticks.push({ left: pos(d.getTime()), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " ’") });
      d.setMonth(d.getMonth() + 3);
    }
    const now = Date.now();
    gantt = (
      <div className="panel scroll">
        <div className="gantt">
          <div className="ticks">
            {ticks.map((t) => <div className="tick" key={t.left} style={{ left: `${t.left}%` }}>{t.label}</div>)}
            {now >= t0 && now <= t1 && <div className="today" style={{ left: `${pos(now)}%` }}>Today</div>}
          </div>
          {P.map((p) => {
            const l = Number(pos(new Date(p.start_date + "T00:00:00").getTime()));
            const w = Math.max(Number(pos(new Date(p.end_date + "T00:00:00").getTime())) - l, 0.5);
            return (
              <div className="grow-g" key={p.id}>
                <div className="lab" title={p.name}>{p.name}</div>
                <div className="track"><div className={`gbar${p.percent_complete === 100 ? " done" : ""}`} style={{ left: `${l}%`, width: `${w}%` }}><i style={{ width: `${p.percent_complete}%` }} /></div></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div><h1>Schedule</h1><p className="sub">{r.project.target_completion ? `Target completion ${fdate(r.project.target_completion)}.` : "Target completion to be set."}{r.project.schedule_note ? ` ${r.project.schedule_note}` : ""}</p></div>
      {gantt}
      <div className="panel scroll">
        {P.length === 0 ? <p className="note" style={{ margin: 0 }}>The phase schedule will appear here once it&rsquo;s posted.</p> : (
          <table>
            <thead><tr><th>Phase</th><th>Start</th><th>Finish</th><th>Status</th></tr></thead>
            <tbody>
              {P.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td><td className="num">{fdate(p.start_date)}</td><td className="num">{fdate(p.end_date)}</td>
                  <td>{p.percent_complete === 100 ? <Pill kind="good">Complete</Pill> : p.percent_complete > 0 ? <Pill kind="info">In progress · {p.percent_complete}%</Pill> : <Pill kind="idle">Upcoming</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
