import { notFound } from "next/navigation";
import { getJobRecord, getViewer } from "@/lib/data";
import { fdate } from "@/lib/format";

export const metadata = { title: "Documents" };

export default async function Docs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { supabase }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  let urls = new Map<string, string>();
  if (r.docs.length) {
    const { data } = await supabase.storage.from("documents").createSignedUrls(r.docs.map((d) => d.storage_path), 3600);
    urls = new Map((data ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  }
  return (
    <>
      <div><h1>Documents</h1><p className="sub">Contract, plans, permits, billing and lien waivers for this job.</p></div>
      <div className="panel">
        <div className="rows">
          {r.docs.length === 0 && <p className="note" style={{ margin: 0 }}>No documents posted yet.</p>}
          {r.docs.map((d) => (
            <div className="row" key={d.id}>
              <div className="grow"><div className="t">{d.title}</div><div className="d">{d.category} · {fdate(d.doc_date)}</div></div>
              {urls.get(d.storage_path) ? <a className="btn ghost sm" href={urls.get(d.storage_path)} target="_blank" rel="noopener">Open</a> : <span className="note">Unavailable</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
