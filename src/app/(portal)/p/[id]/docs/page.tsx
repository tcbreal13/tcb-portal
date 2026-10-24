import { notFound } from "next/navigation";
import { requireSection, getViewer } from "@/lib/data";
import { fdate } from "@/lib/format";
import { OTHER_FOLDER, folderTree, resolveFolder } from "@/lib/doc-folders";
import { DocsBrowser, type BrowserDoc } from "./DocsBrowser";

export const metadata = { title: "Documents" };

export default async function Docs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { supabase, profile, user }] = await Promise.all([requireSection(id, "documents"), getViewer()]);
  if (!r) notFound();
  const isBuilder = profile.role === "builder";
  const [{ data: folderRows }, signed] = await Promise.all([
    supabase.from("doc_folders").select("path").eq("project_id", id),
    r.docs.length ? supabase.storage.from("documents").createSignedUrls(r.docs.map((d) => d.storage_path), 3600) : Promise.resolve({ data: [] }),
  ]);
  const custom = (folderRows ?? []).map((f) => f.path);
  const urls = new Map((signed.data ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  const docs: BrowserDoc[] = r.docs.map((d) => ({
    id: d.id, title: d.title, date: fdate(d.doc_date), folder: resolveFolder(d.category, custom),
    url: urls.get(d.storage_path) ?? null, mine: d.uploaded_by === user.id,
  }));
  const tree = folderTree(custom, docs.some((d) => d.folder === OTHER_FOLDER));

  return (
    <>
      <div><h1>Documents</h1><p className="sub">Contract, budget, plans, inspection reports and site records for this job. Drag files onto a folder to upload.</p></div>
      <DocsBrowser projectId={id} isBuilder={isBuilder} tree={tree} docs={docs} />
    </>
  );
}
