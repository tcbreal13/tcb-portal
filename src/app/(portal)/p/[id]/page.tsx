import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobRecord, billedTotal, revisedContract, pendingCos, openSelections, duePayApps } from "@/lib/data";
import { usd, signed, fdate, fshort, fweekday } from "@/lib/format";

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const base = `/p/${id}`;
  const pc = pendingCos(r), os = openSelections(r), due = duePayApps(r);
  const wait = pc.length + os.length;
  const billed = billedTotal(r), revised = revisedContract(r);
  const pct = revised > 0 ? Math.round((billed / revised) * 100) : 0;
  const u = r.updates[0];
  const today = new Date().toISOString().slice(0, 10);
  const ahead = r.lookahead.filter((l) => l.item_date >= today).slice(0, 6);
  // No hand-written look-ahead? Show the next scheduled tasks instead.
  const nextTasks = ahead.length ? [] : r.tasks.filter((t) => t.show_client && t.status !== "complete" && t.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6);

  return (
    <>
      <div>
        <div className="eyebrow">{r.project.address}</div>
        <h1>{r.project.name}</h1>
        {(r.project.description || r.project.current_phase) && (
          <p className="sub">{r.project.description}{r.project.description && r.project.current_phase ? ". " : ""}{r.project.current_phase && `Current phase: ${r.project.current_phase}.`}</p>
        )}
      </div>
      <div className="stats">
        <div className="stat"><span>Waiting on you</span><b>{wait} {wait === 1 ? "decision" : "decisions"}</b></div>
        <div className="stat"><span>Target completion</span><b>{r.project.target_completion ? fdate(r.project.target_completion, { month: "short", year: "2-digit" }).replace(" ", " ’") : "TBD"}</b></div>
        <div className="stat"><span>Billed to date</span><b>{usd(billed)}</b><span>{pct}% of {usd(revised)}</span></div>
        <div className="stat"><span>Schedule</span><b>{r.project.schedule_status || "On track"}</b>{r.project.schedule_note && <span>{r.project.schedule_note}</span>}</div>
      </div>
      <div className="cols">
        <div className="panel">
          <h2>Waiting on you</h2>
          <div className="rows">
            {pc.map((c) => (
              <div className="row" key={c.id}>
                <div className="grow"><div className="t">Approve {c.code}: {c.title}</div><div className="d">{signed(c.amount)} · sent {fshort(c.sent_date)}</div></div>
                <Link href={`${base}/changes`} className="btn ghost sm">Review</Link>
              </div>
            ))}
            {os.map((s) => (
              <div className="row" key={s.id}>
                <div className="grow"><div className="t">Choose: {s.item}</div><div className="d">{s.needed_by ? `Needed by ${fshort(s.needed_by)}` : "No deadline set"}</div></div>
                <Link href={`${base}/selections`} className="btn ghost sm">Choose</Link>
              </div>
            ))}
            {due.map((p) => (
              <div className="row" key={p.id}>
                <div className="grow"><div className="t">Pay application #{p.number}</div><div className="d">{usd(p.amount)}{p.status_date ? ` · due ${fshort(p.status_date)}` : ""}</div></div>
                <Link href={`${base}/budget`} className="btn ghost sm">View</Link>
              </div>
            ))}
            {wait + due.length === 0 && <p className="note" style={{ margin: 0 }}>Nothing right now. You&rsquo;re all caught up.</p>}
          </div>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Latest update from Tim</h2>
            {u ? (<><div className="eyebrow">{fdate(u.update_date)}</div><p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{u.body}</p></>)
               : <p className="note" style={{ margin: 0 }}>No update posted yet.</p>}
          </div>
          <div className="panel">
            <h2>Coming up on site</h2>
            <div className="rows">
              {ahead.map((l) => (
                <div className="row" key={l.id}><span className="num" style={{ width: 96 }}>{fweekday(l.item_date)}</span><div className="grow">{l.body}</div></div>
              ))}
              {nextTasks.map((t) => (
                <div className="row" key={t.id}><span className="num" style={{ width: 96 }}>{fweekday(t.start_date < today ? today : t.start_date)}</span><div className="grow">{t.title}{t.status === "in_progress" && <span className="pill info" style={{ marginLeft: 8 }}>Under way</span>}</div></div>
              ))}
              {ahead.length + nextTasks.length === 0 && <p className="note" style={{ margin: 0 }}>The look-ahead will appear here as it&rsquo;s posted.</p>}
              {nextTasks.length > 0 && <p className="note" style={{ margin: "8px 0 0" }}><Link href={`${base}/schedule`}>Full schedule and Gantt chart →</Link></p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
