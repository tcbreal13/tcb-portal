import { notFound } from "next/navigation";
import { getJobRecord } from "@/lib/data";
import { fweekday } from "@/lib/format";

export const metadata = { title: "Daily logs" };

export default async function Logs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  return (
    <>
      <div><h1>Daily logs &amp; photos</h1><p className="sub">Posted from the site at the end of each working day.</p></div>
      {r.logs.length === 0 && <div className="panel"><p className="note" style={{ margin: 0 }}>No logs yet.</p></div>}
      {r.logs.map((l) => (
        <div className="panel" key={l.id}>
          <div className="row nt">
            <div className="grow"><h2 style={{ margin: 0 }}>{fweekday(l.log_date)}</h2></div>
            <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{[l.weather, l.crew].filter(Boolean).join(" · ")}</span>
          </div>
          <p style={{ margin: 0, maxWidth: "70ch", whiteSpace: "pre-wrap" }}>{l.note}</p>
          {l.photos.length > 0 && (
            <div className="photos">
              {l.photos.map((p) => (
                <a className="ph" key={p.id} href={p.url} target="_blank" rel="noopener" title={p.caption}>
                  {p.url && <img src={p.url} alt={p.caption || "Site photo"} loading="lazy" />}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
