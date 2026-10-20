import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobRecord, getViewer } from "@/lib/data";
import { fdate } from "@/lib/format";
import { DOC_FOLDERS, OTHER_FOLDER, CLIENT_FOLDER, normalizeFolder } from "@/lib/doc-folders";
import { ClientUploadForm, RemoveOwnUpload } from "./ClientUpload";

export const metadata = { title: "Documents" };

export default async function Docs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { supabase, profile, user }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  const isBuilder = profile.role === "builder";
  let urls = new Map<string, string>();
  if (r.docs.length) {
    const { data } = await supabase.storage.from("documents").createSignedUrls(r.docs.map((d) => d.storage_path), 3600);
    urls = new Map((data ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  }
  const byFolder = new Map<string, typeof r.docs>();
  for (const d of r.docs) { const f = normalizeFolder(d.category); byFolder.set(f, [...(byFolder.get(f) ?? []), d]); }
  const folders = [...DOC_FOLDERS.map((f) => ({ ...f })), ...(byFolder.has(OTHER_FOLDER) ? [{ name: OTHER_FOLDER, blurb: "" }] : [])];

  return (
    <>
      <div><h1>Documents</h1><p className="sub">Contract, budget, inspection reports and site records for this job, filed the same way on every TCB project.</p></div>
      {folders.map((f) => {
        const docs = byFolder.get(f.name) ?? [];
        return (
          <div className="panel" key={f.name}>
            <div className="row nt">
              <div className="grow"><h2 style={{ margin: 0 }}>{f.name}</h2>{f.blurb && <div className="d" style={{ fontSize: 13, color: "var(--muted)" }}>{f.blurb}</div>}</div>
              <span className="pill idle">{docs.length} {docs.length === 1 ? "file" : "files"}</span>
              {isBuilder && f.name !== CLIENT_FOLDER && <Link href={`/p/${id}/manage/docs?folder=${encodeURIComponent(f.name)}`} className="btn sm">Upload</Link>}
            </div>
            <div className="rows">
              {docs.length === 0 && <p className="note" style={{ margin: 0 }}>{f.name === CLIENT_FOLDER ? "Nothing shared yet." : "Nothing filed here yet."}</p>}
              {docs.map((d) => (
                <div className="row" key={d.id}>
                  <div className="grow"><div className="t">{d.title}</div><div className="d">{fdate(d.doc_date)}</div></div>
                  {urls.get(d.storage_path) ? <a className="btn ghost sm" href={urls.get(d.storage_path)} target="_blank" rel="noopener">Open</a> : <span className="note">Unavailable</span>}
                  {f.name === CLIENT_FOLDER && d.uploaded_by === user.id && <RemoveOwnUpload projectId={id} docId={d.id} />}
                </div>
              ))}
            </div>
            {f.name === CLIENT_FOLDER && !isBuilder && <ClientUploadForm projectId={id} />}
          </div>
        );
      })}
    </>
  );
}
