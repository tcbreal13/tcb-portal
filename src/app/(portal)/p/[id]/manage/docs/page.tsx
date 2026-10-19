import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { fdate, todayISO } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { uploadDocument, deleteRow } from "../actions";

export const metadata = { title: "Documents" };
const CATEGORIES = ["Contract", "Plans", "Permits", "Reports", "Insurance", "Schedule", "Billing", "Lien waiver", "Change order", "Selections", "Other"];

export default async function ManageDocs({ params }: { params: Promise<{ id: string }> }) {
  await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const upload = uploadDocument.bind(null, id);
  return (
    <>
      <div><h1>Documents</h1><p className="sub">PDFs the client can open: contract, permit set, pay apps, lien waivers, signed change orders.</p></div>
      <div className="panel">
        <h2>Upload</h2>
        <AdminForm action={upload} submit="Upload" reset>
          <label htmlFor="file" style={{ marginTop: 0 }}>File</label>
          <input id="file" name="file" type="file" required />
          <div className="grid2">
            <div><label htmlFor="title">Title</label><input id="title" name="title" type="text" placeholder="Pay application #7" /></div>
            <div><label htmlFor="category">Category</label><select id="category" name="category" defaultValue="Other">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label htmlFor="doc_date">Date</label><input id="doc_date" name="doc_date" type="date" defaultValue={todayISO()} /></div>
          </div>
        </AdminForm>
      </div>
      <div className="panel">
        <h2>Posted</h2>
        <div className="rows">
          {r.docs.length === 0 && <p className="note" style={{ margin: 0 }}>Nothing uploaded yet.</p>}
          {r.docs.map((d) => (
            <div className="row" key={d.id}>
              <div className="grow"><div className="t">{d.title}</div><div className="d">{d.category} · {fdate(d.doc_date)}</div></div>
              <DeleteButton onDelete={deleteRow.bind(null, id, "documents", d.id)} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
