"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { directUpload, MAX_UPLOAD_MB } from "@/lib/direct-upload";
import { isClientPath, type FolderNode } from "@/lib/doc-folders";
import { clientUpload, removeOwnUpload } from "../actions";
import { uploadDocument } from "../manage/actions";
import { createFolder, deleteFolder } from "../folder-actions";

export interface BrowserDoc { id: string; title: string; date: string; folder: string; url: string | null; mine: boolean }

/**
 * Folder tree for a job's documents. Drop files onto any folder you're allowed to file into (or tap "Add files").
 * Tim can file anywhere and add folders anywhere; clients file into "Client uploads" and its subfolders.
 */
export function DocsBrowser({ projectId, isBuilder, tree, docs }: { projectId: string; isBuilder: boolean; tree: FolderNode[]; docs: BrowserDoc[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ path: string; text: string; bad?: boolean } | null>(null);
  const [, start] = useTransition();
  const canFile = (path: string) => isBuilder || isClientPath(path);
  const canAddSub = (path: string) => isBuilder || isClientPath(path);
  const countIn = (path: string): number => docs.filter((d) => d.folder === path || d.folder.startsWith(path + " / ")).length;

  async function upload(path: string, files: File[]) {
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append("file", f);
    try {
      await directUpload(fd, { bucket: "documents", prefix: isBuilder ? `${projectId}/files` : `${projectId}/client-uploads` }, (t) => setStatus({ path, text: t }));
      setStatus({ path, text: "Filing…" });
      let r: { error?: string; ok?: string } | null;
      if (isBuilder) { fd.set("category", path); r = await uploadDocument(projectId, null, fd); }
      else { fd.set("folder", path); r = await clientUpload(projectId, null, fd); }
      setStatus({ path, text: r?.error ?? r?.ok ?? "Done.", bad: !!r?.error });
      start(() => router.refresh());
    } catch (e) {
      setStatus({ path, text: e instanceof Error ? e.message : "Upload failed.", bad: true });
    }
  }

  async function addFolder(parent: string | null) {
    const name = prompt(parent ? `New folder inside “${parent.split(" / ").at(-1)}”:` : "New folder name:");
    if (!name) return;
    const r = await createFolder(projectId, parent, name);
    setStatus({ path: parent ?? "", text: r.error ?? r.ok ?? "", bad: !!r.error });
    start(() => router.refresh());
  }
  async function removeFolder(path: string) {
    if (!confirm(`Remove the empty folder “${path.split(" / ").at(-1)}”?`)) return;
    const r = await deleteFolder(projectId, path);
    setStatus({ path, text: r.error ?? r.ok ?? "", bad: !!r.error });
    start(() => router.refresh());
  }

  return (
    <>
      {isBuilder && (
        <div className="btns" style={{ marginBottom: 12 }}>
          <button type="button" className="btn sm" onClick={() => addFolder(null)}>+ New folder</button>
          {status?.path === "" && <span className={status.bad ? "err" : "ok"} style={{ margin: 0 }}>{status.text}</span>}
        </div>
      )}
      {tree.map((n) => (
        <Folder key={n.path} node={n} docs={docs} projectId={projectId} isBuilder={isBuilder} status={status}
          canFile={canFile} canAddSub={canAddSub} countIn={countIn} onUpload={upload} onAddSub={addFolder} onRemove={removeFolder} />
      ))}
      <p className="note">Drag files from your computer onto a folder to upload them, or use “Add files”. Up to {MAX_UPLOAD_MB} MB each.</p>
    </>
  );
}

function Folder({ node, docs, projectId, isBuilder, status, canFile, canAddSub, countIn, onUpload, onAddSub, onRemove }: {
  node: FolderNode; docs: BrowserDoc[]; projectId: string; isBuilder: boolean; status: { path: string; text: string; bad?: boolean } | null;
  canFile: (p: string) => boolean; canAddSub: (p: string) => boolean; countIn: (p: string) => number;
  onUpload: (p: string, f: File[]) => void; onAddSub: (p: string) => void; onRemove: (p: string) => void;
}) {
  const [over, setOver] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const here = docs.filter((d) => d.folder === node.path);
  const total = countIn(node.path);
  const droppable = canFile(node.path);
  const removable = !node.standard && total === 0 && node.children.length === 0 && (isBuilder || isClientPath(node.path));
  const Tag = node.depth === 0 ? "div" : "section";

  return (
    <Tag
      className={`${node.depth === 0 ? "panel" : "subfolder"} dropzone${over ? " over" : ""}`}
      onDragOver={droppable ? (e) => { e.preventDefault(); e.stopPropagation(); setOver(true); } : undefined}
      onDragLeave={droppable ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); } : undefined}
      onDrop={droppable ? (e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onUpload(node.path, [...e.dataTransfer.files]); } : undefined}
    >
      <div className="row nt">
        <div className="grow">
          {node.depth === 0 ? <h2 style={{ margin: 0 }}>{node.name}</h2> : <h3 style={{ margin: 0 }}>📁 {node.name}</h3>}
          {node.blurb && <div className="d" style={{ fontSize: 13, color: "var(--muted)" }}>{node.blurb}</div>}
        </div>
        <span className="pill idle">{total} {total === 1 ? "file" : "files"}</span>
        {droppable && <>
          <input ref={pick} type="file" multiple hidden onChange={(e) => { onUpload(node.path, [...(e.target.files ?? [])]); e.target.value = ""; }} />
          <button type="button" className="btn sm" onClick={() => pick.current?.click()}>Add files</button>
        </>}
        {canAddSub(node.path) && node.depth < 3 && <button type="button" className="btn ghost sm" onClick={() => onAddSub(node.path)}>+ Subfolder</button>}
        {removable && <button type="button" className="btn ghost sm" onClick={() => onRemove(node.path)} aria-label={`Remove folder ${node.name}`}>Remove</button>}
      </div>
      {over && <div className="dropnote">Drop to upload into {node.name}</div>}
      {status?.path === node.path && <p className={status.bad ? "err" : "ok"} style={{ margin: "6px 0 0" }}>{status.text}</p>}
      <div className="rows">
        {here.length === 0 && node.children.length === 0 && <p className="note" style={{ margin: 0 }}>{droppable ? "Empty — drop files here." : "Nothing filed here yet."}</p>}
        {here.map((d) => (
          <div className="row" key={d.id}>
            <div className="grow"><div className="t">{d.title}</div><div className="d">{d.date}</div></div>
            {d.url ? <a className="btn ghost sm" href={d.url} target="_blank" rel="noopener">Open</a> : <span className="note">Unavailable</span>}
            {!isBuilder && d.mine && <RemoveOwn projectId={projectId} docId={d.id} />}
            {isBuilder && <Link className="btn ghost sm" href={`/p/${projectId}/manage/docs`}>Manage</Link>}
          </div>
        ))}
      </div>
      {node.children.map((c) => (
        <Folder key={c.path} node={c} docs={docs} projectId={projectId} isBuilder={isBuilder} status={status}
          canFile={canFile} canAddSub={canAddSub} countIn={countIn} onUpload={onUpload} onAddSub={onAddSub} onRemove={onRemove} />
      ))}
    </Tag>
  );
}

function RemoveOwn({ projectId, docId }: { projectId: string; docId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <button type="button" className="btn ghost sm" disabled={pending} onClick={() => { if (confirm("Remove this file?")) start(async () => { await removeOwnUpload(projectId, docId); router.refresh(); }); }}>{pending ? "…" : "Remove"}</button>;
}
