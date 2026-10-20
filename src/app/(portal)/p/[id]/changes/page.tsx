import { notFound } from "next/navigation";
import { getJobRecord, getViewer, approvedTotal, pendingCos } from "@/lib/data";
import { signed, fshort, sum } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { DecideButtons } from "./DecideButtons";

export const metadata = { title: "Change orders" };

export default async function Changes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { profile }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  const cos = [...r.changeOrders].reverse();
  return (
    <>
      <div><h1>Change orders</h1><p className="sub">Approved changes total {signed(approvedTotal(r))}. Pending changes total {signed(sum(pendingCos(r), (c) => c.amount))} and do not affect the contract until you approve them.</p></div>
      {cos.length === 0 && <div className="panel"><p className="note" style={{ margin: 0 }}>No change orders on this job.</p></div>}
      {cos.map((c) => (
        <div className="panel" key={c.id}>
          <div className="row nt">
            <div className="grow"><div className="eyebrow">{c.code} · sent {fshort(c.sent_date)}</div><h2 style={{ margin: "2px 0 0" }}>{c.title}</h2></div>
            <span className="num" style={{ fontSize: 17, fontWeight: 500 }}>{signed(c.amount)}</span>
            {c.status === "approved" ? <Pill kind="good">Approved {fshort(c.decided_date)}</Pill> : c.status === "declined" ? <Pill kind="crit">Declined {fshort(c.decided_date)}</Pill> : <Pill kind="warn">Needs your decision</Pill>}
          </div>
          <p style={{ margin: 0, maxWidth: "70ch", whiteSpace: "pre-wrap" }}>{c.description}</p>
          {c.signed_name && c.status !== "pending" && <p className="note">Signed <b>{c.signed_name}</b> · {fshort(c.decided_date)}</p>}
          {c.status === "pending" && <DecideButtons projectId={id} coId={c.id} code={c.code} title={c.title} amountLabel={signed(c.amount)} defaultName={profile.full_name} />}
        </div>
      ))}
    </>
  );
}
