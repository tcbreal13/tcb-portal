"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { directUpload, MAX_UPLOAD_MB } from "@/lib/direct-upload";
import { SEP, isClientPath, type FolderNode } from "@/lib/doc-folders";
import { clientUpload, removeOwnUpload } from "../actions";
import { uploadDocument, deleteRow } from "../manage/actions";
import { createFolder, deleteFolder } from "../folder-actions";

export interface BrowserDoc { id: string; title: string; date: string; sortDate: string; folder: string; url: string | null; ext: string; mine: boolean }
type Status = { text: string; bad?: boolean } | null;

const pretty = (s: string) => s.replace(/_+/g, " ").replace(/\s+-\s+/g, " – ").replace(/\s{2,}/g, " ").trim();

/** File-browser view of a job's documents: breadcrumbs, folders you open, a tidy file list. Drop files anywhere on it (or onto a folder). */
export function DocsBrowser({ projectId, isBuilder, tree, docs, current }: { projectId: string; isBuilder: boolean; tree: FolderNode[]; docs: BrowserDoc[]; current: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const pick = useRef<HTMLInputElement>(null);

  const find = (nodes: FolderNode[], p: string): FolderNode | null => {
    for (const n of nodes) { if (n.path === p) return n; const c = find(n.children, p); if (c) return c; }
    return null;
  };
  const node = current ? find(tree, current) : null;
  const folders = node ? node.children : tree;
  const files = node ? docs.filter((d) => d.folder === node.path).sort((a, b) => b.sortDate.localeCompare(a.sortDate)) : [];
  const count = (p: string) => docs.filter((d) => d.folder === p || d.folder.startsWith(p + SEP)).length;
  const canFile = (p: string | null) => !!p && (isBuilder || isClientPath(p));
  const canAdd = isBuilder || (!!node && isClientPath(node.path));
  const href = (p: string | null) => `/p/${projectId}/docs${p ? `?f=${encodeURIComponent(p)}` : ""}`;
  const crumbs = node ? node.path.split(SEP).map((name, i, a) => ({ name, path: a.slice(0, i + 1).join(SEP) })) : [];

  async function upload(path: string, list: File[]) {
    if (!list.length) return;
    const fd = new FormData();
    for (const f of list) fd.append("file", f);
    const where = path.split(SEP).at(-1);
    try {
      await directUpload(fd, { bucket: "documents", prefix: isBuilder ? `${projectId}/files` : `${projectId}/client-uploads` }, (t) => setStatus({ text: `${t} → ${where}` }));
      setStatus({ text: `Filing in ${where}…` });
      let r: { error?: string; ok?: string } | null;
      if (isBuilder) { fd.set("category", path); r = await uploadDocument(projectId, null, fd); }
      else { fd.set("folder", path); r = await clientUpload(projectId, null, fd); }
      setStatus({ text: r?.error ?? r?.ok ?? "Done.", bad: !!r?.error });
      start(() => router.refresh());
    } catch (e) { setStatus({ text: e instanceof Error ? e.message : "Upload failed.", bad: true }); }
  }
  async function newFolder() {
    const name = prompt(node ? `New folder inside “${node.name}”:` : "New folder name:");
    if (!name) return;
    const r = await createFolder(projectId, node?.path ?? null, name);
    setStatus({ text: r.error ?? r.ok ?? "", bad: !!r.error });
    start(() => router.refresh());
  }
  async function removeFolder(p: string) {
    if (!confirm(`Remove the empty folder “${p.split(SEP).at(-1)}”?`)) return;
    const r = await deleteFolder(projectId, p);
    setStatus({ text: r.error ?? r.ok ?? "", bad: !!r.error });
    start(() => router.refresh());
  }
  async function removeFile(d: BrowserDoc) {
    if (!confirm(`Delete “${pretty(d.title)}”? This can't be undone.`)) return;
    if (isBuilder) await deleteRow(projectId, "documents", d.id); else await removeOwnUpload(projectId, d.id);
    start(() => router.refresh());
  }
  const dropProps = (p: string | null) => canFile(p) ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(p); },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) setOver(null); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(null); upload(p!, [...e.dataTransfer.files]); },
  } : {};

  return (
    <div className={`fb${over && over === node?.path ? " over" : ""}`} {...dropProps(node?.path ?? null)}>
      <div className="fb-bar">
        <nav className="fb-crumbs" aria-label="Folder path">
          {node ? <Link href={href(null)}>Documents</Link> : <span>Documents</span>}
          {crumbs.map((c, i) => (
            <span key={c.path}><span className="sep">›</span>{i === crumbs.length - 1 ? <span>{c.name}</span> : <Link href={href(c.path)}>{c.name}</Link>}</span>
          ))}
        </nav>
        <div className="fb-tools">
          {canAdd && <button type="button" className="btn ghost sm" onClick={newFolder}>New folder</button>}
          {canFile(node?.path ?? null) && <>
            <input ref={pick} type="file" multiple hidden onChange={(e) => { upload(node!.path, [...(e.target.files ?? [])]); e.target.value = ""; }} />
            <button type="button" className="btn sm" onClick={() => pick.current?.click()}>Upload</button>
          </>}
        </div>
      </div>
      {status && <div className={`fb-status ${status.bad ? "err" : "ok"}`}>{status.text}</div>}
      {node?.blurb && <p className="fb-blurb">{node.blurb}</p>}

      <div className="fb-list" role="list">
        {node && (
          <Link href={href(crumbs.length > 1 ? crumbs[crumbs.length - 2].path : null)} className="fb-row up" role="listitem">
            <span className="fb-ico" aria-hidden="true">↰</span><span className="fb-name">Back</span>
          </Link>
        )}
        {folders.map((f) => {
          const n = count(f.path);
          const removable = !f.standard && n === 0 && f.children.length === 0 && (isBuilder || isClientPath(f.path));
          return (
            <div key={f.path} className={`fb-row folder${over === f.path ? " over" : ""}`} role="listitem" {...dropProps(f.path)}>
              <Link href={href(f.path)} className="fb-main">
                <FolderIcon />
                <span className="fb-name">{f.name}{!node && f.blurb && <span className="fb-sub">{f.blurb}</span>}</span>
                <span className="fb-meta">{n ? `${n} file${n === 1 ? "" : "s"}` : "Empty"}</span>
                <span className="fb-chev" aria-hidden="true">›</span>
              </Link>
              {removable ? <button type="button" className="fb-x" onClick={() => removeFolder(f.path)} aria-label={`Remove folder ${f.name}`} title="Remove empty folder">×</button> : <span className="fb-x" aria-hidden="true" />}
            </div>
          );
        })}
        {files.map((d) => (
          <div key={d.id} className="fb-row file" role="listitem">
            {d.url ? <a href={d.url} target="_blank" rel="noopener" className="fb-main"><FileIcon ext={d.ext} /><span className="fb-name">{pretty(d.title)}</span><span className="fb-meta">{d.date}</span></a>
              : <span className="fb-main"><FileIcon ext={d.ext} /><span className="fb-name">{pretty(d.title)}</span><span className="fb-meta">Unavailable</span></span>}
            {(isBuilder || d.mine) ? <button type="button" className="fb-x" onClick={() => removeFile(d)} aria-label={`Delete ${d.title}`} title="Delete">×</button> : <span className="fb-x" aria-hidden="true" />}
          </div>
        ))}
        {node && folders.length === 0 && files.length === 0 && (
          <div className="fb-empty">{canFile(node.path) ? "This folder is empty. Drop files here or tap Upload." : "Nothing filed here yet."}</div>
        )}
      </div>
      {over && <div className="fb-dropnote">Drop to upload into {over.split(SEP).at(-1)}</div>}
      <p className="fb-foot">{canFile(node?.path ?? null) ? `Drag files onto this window or a folder to upload · up to ${MAX_UPLOAD_MB} MB each` : node ? "" : `Open a folder to see its files. Drag files onto a folder to upload · up to ${MAX_UPLOAD_MB} MB each`}</p>
    </div>
  );
}

function FolderIcon() {
  return <svg className="fb-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill="var(--accent)" /></svg>;
}
function FileIcon({ ext }: { ext: string }) {
  return (
    <span className="fb-ico fb-file" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M14 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <span className="fb-ext">{ext.slice(0, 4)}</span>
    </span>
  );
}
