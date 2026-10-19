import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord, pendingCos, openSelections, duePayApps } from "@/lib/data";
import { usd, signed, fshort } from "@/lib/format";
import { Pill } from "@/components/Pill";

export const metadata = { title: "Needs attention" };

export default async function Attention({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const base = `/p/${id}/manage`;
  const today = new Date();
  const daysSince = (d: string) => Math.floor((today.getTime() - new Date(d + "T00:00:00").getTime()) / 86400000);

  const items: { kind: "crit" | "warn" | "info"; label: string; t: string; d: string; href: string }[] = [];
  for (const p of duePayApps(r)) items.push({ kind: "crit", label: "Money", t: `Pay app #${p.number} unpaid: ${usd(p.amount)}`, d: p.status_date ? `Due ${fshort(p.status_date)}.` : "No due date set.", href: `${base}/budget` });
  for (const c of pendingCos(r)) items.push({ kind: "warn", label: "Decision", t: `Client has not answered ${c.code} (${signed(c.amount)})`, d: `Sent ${fshort(c.sent_date)}, ${daysSince(c.sent_date)} days ago.`, href: `${base}/changes` });
  for (const s of openSelections(r)) items.push({ kind: "warn", label: "Decision", t: `Selection open: ${s.item}`, d: s.needed_by ? `Needed by ${fshort(s.needed_by)}${daysSince(s.needed_by) > 0 ? " — overdue." : "."}` : "No deadline set.", href: `${base}/selections` });
  const lastUpdate = r.updates[0];
  const upDays = lastUpdate ? daysSince(lastUpdate.update_date) : null;
  if (upDays === null || upDays >= 7) items.push({ kind: "info", label: "Heads-up", t: lastUpdate ? `No weekly update since ${fshort(lastUpdate.update_date)}` : "No weekly update posted yet", d: `${r.logs.filter((l) => daysSince(l.log_date) <= 7).length} daily logs this week are ready to summarize.`, href: `${base}/updates` });
  const lastLog = r.logs[0];
  if (!lastLog || daysSince(lastLog.log_date) >= 3) items.push({ kind: "info", label: "Heads-up", t: lastLog ? `Last daily log was ${fshort(lastLog.log_date)}` : "No daily logs yet", d: "Clients check logs most; a gap reads as silence.", href: `${base}/logs` });
  if (r.members === 0) items.push({ kind: "info", label: "Setup", t: "No client has access to this job yet", d: "Invite them so they can sign in.", href: `${base}/people` });
  const lastMsg = r.messages[r.messages.length - 1];
  if (lastMsg && lastMsg.sender_id !== r.viewerId) items.push({ kind: "warn", label: "Message", t: `Last message is from ${lastMsg.sender_name}`, d: lastMsg.body.slice(0, 120), href: `/p/${id}/messages` });

  return (
    <>
      <div><h1>Needs attention</h1><p className="sub">What is open, late or worth telling the client on {r.project.name}.</p></div>
      <div className="panel">
        <div className="rows">
          {items.length === 0 && <p className="note" style={{ margin: 0 }}>Nothing open. Nice.</p>}
          {items.map((i, k) => (
            <div className="row" key={k}>
              <Pill kind={i.kind}>{i.label}</Pill>
              <div className="grow"><div className="t">{i.t}</div><div className="d">{i.d}</div></div>
              <Link href={i.href} className="btn ghost sm">Open</Link>
            </div>
          ))}
        </div>
      </div>
      <div className="btns">
        <Link href={`${base}/logs`} className="btn">Post today&rsquo;s log</Link>
        <Link href={`${base}/updates`} className="btn ghost">Draft this week&rsquo;s update</Link>
        <Link href={`/p/${id}`} className="btn ghost">See the client view</Link>
      </div>
    </>
  );
}
