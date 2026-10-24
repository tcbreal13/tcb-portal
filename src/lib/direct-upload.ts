"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Where a form's files go. `prefix` may hold {field} placeholders filled from the form (e.g. "{number}").
 * Files go browser → Supabase Storage directly, so Vercel's ~4.5 MB request limit never applies.
 */
export interface UploadTarget { bucket: "photos" | "documents"; prefix: string; maxMB?: number }

export const MAX_UPLOAD_MB = 50; // Supabase caps single files at 50 MB while the spend cap is on
const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);

/** Uploads every chosen file in `fd`, then swaps each file for `<field>__uploaded` = {path,name,type,size}. */
export async function directUpload(fd: FormData, t: UploadTarget, onStatus: (s: string) => void): Promise<void> {
  const supabase = createClient();
  const max = t.maxMB ?? MAX_UPLOAD_MB;
  const prefix = t.prefix.replace(/\{(\w+)\}/g, (_, k: string) => safe(String(fd.get(k) ?? "")) || "x");
  const all = [...fd.entries()];
  const files = all.filter((e): e is [string, File] => e[1] instanceof File && e[1].size > 0);
  new Set(all.filter(([, v]) => v instanceof File).map(([k]) => k)).forEach((k) => fd.delete(k));
  const failures: string[] = [];
  let i = 0;
  for (const [field, file] of files) {
    i++;
    onStatus(files.length > 1 ? `Uploading ${i} of ${files.length}…` : "Uploading…");
    if (file.size > max * 1024 * 1024) { failures.push(`${file.name} (over ${max} MB)`); continue; }
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe(file.name)}`;
    const { error } = await supabase.storage.from(t.bucket).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) { failures.push(`${file.name} (${error.message})`); continue; }
    fd.append(`${field}__uploaded`, JSON.stringify({ path, name: file.name, type: file.type, size: file.size }));
  }
  if (failures.length) fd.append("__upload_failures", failures.join(", "));
}
