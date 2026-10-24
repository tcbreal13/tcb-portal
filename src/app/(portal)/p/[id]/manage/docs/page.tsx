import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fdate, todayISO } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { uploadDocument, deleteRow } from "../actions";
import { DOC_FOLDERS, OTHER_FOLDER, normalizeFolder } from "@/lib/doc-folders";

export const metadata = { title: "Documents" };

export default async function ManageDocs({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ folder?: string }> }) {
  await requireBuilder();
  const [{ id }, { folder }] = await Promise.all([params, searchParams]);
  const r = await getJobRecord(id);
  if (!r) notFound();
  const upload = uploadDocument.bind(null, id);
  const names = [...DOC_FOLDERS.map((f) => f.name), OTHER_FOLDER];
  const preset = folder && names.includes(folder) ? folder : names[0];
  const byFolder = new Map<string, typeof r.docs>();
  for (const d of r.docs) { const f = normalizeFolder(d.category); byFolder.set(f, [...(byFolder.get(f) ?? []), d]); }

  return (
    <>
      <div><h1>Documents</h1><p className="sub">Every job has the same five folders. Pick the folder, choose one or more PDFs, upload.</p></div>
      <div className="panel">
        <h2>Upload</h2>
        <AdminForm action={upload} submit="Upload" reset uploadTo={{ bucket: "documents", prefix: `${id}/files` }}>
          <label htmlFor="category" style={{ marginTop: 0 }}>Folder</label>
          <select id="category" name="category" defaultValue={preset}>{names.map((c) => <option key={c}>{c}</option>)}</select>
          <label htmlFor="file">Files (PDF or images; several at once is fine)</label>
          <input id="file" name="file" type="file" multiple required />
          <div className="grid2">
            <div><label htmlFor="title">Title (optional — defaults to the file name)</label><input id="title" name="title" type="text" placeholder="Structural observation #3 — shear walls" /></div>
            <div><label htmlFor="doc_date">Date</label><input id="doc_date" name="doc_date" type="date" defaultValue={todayISO()} /></div>
          </div>
        </AdminForm>
      </div>
      {names.map((name) => {
        const docs = byFolder.get(name) ?? [];
        if (name === OTHER_FOLDER && docs.length === 0) return null;
        return (
          <div className="panel" key={name}>
            <h2>{name} <span className="pill idle" style={{ marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>{docs.length}</span></h2>
            <div className="rows">
              {docs.length === 0 && <p className="note" style={{ margin: 0 }}>Empty.</p>}
              {docs.map((d) => (
                <div className="row" key={d.id}>
                  <div className="grow"><div className="t">{d.title}</div><div className="d">{fdate(d.doc_date)}</div></div>
                  <DeleteButton onDelete={deleteRow.bind(null, id, "documents", d.id)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
