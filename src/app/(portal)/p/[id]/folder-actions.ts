"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { CLIENT_FOLDER, SEP, STANDARD_NAMES, OTHER_FOLDER, cleanFolderName, isClientPath } from "@/lib/doc-folders";

type R = { error?: string; ok?: string };

/** Add a folder (parent = null for top level). Tim can add anywhere; clients only inside "Client uploads". */
export async function createFolder(projectId: string, parent: string | null, rawName: string): Promise<R> {
  const { supabase, user, profile, viewAs } = await getViewer();
  if (viewAs) return { error: "Preview mode — nothing is saved." };
  const name = cleanFolderName(rawName);
  if (!name) return { error: "Give the folder a name." };
  const path = parent ? `${parent}${SEP}${name}` : name;
  if (path.split(SEP).length > 4) return { error: "Folders can go three levels deep." };
  if (!parent && (STANDARD_NAMES.some((s) => s.toLowerCase() === name.toLowerCase()) || name.toLowerCase() === OTHER_FOLDER.toLowerCase())) return { error: "That folder already exists." };
  if (profile.role !== "builder" && !(parent && isClientPath(parent))) return { error: `You can add folders inside “${CLIENT_FOLDER}”.` };
  const { error } = await supabase.from("doc_folders").insert({ project_id: projectId, path, created_by: user.id });
  revalidatePath(`/p/${projectId}`, "layout");
  if (error) return { error: error.code === "23505" ? "A folder with that name is already there." : error.message };
  return { ok: `Folder “${name}” added.` };
}

/** Remove an empty folder. */
export async function deleteFolder(projectId: string, path: string): Promise<R> {
  const { supabase, viewAs } = await getViewer();
  if (viewAs) return { error: "Preview mode — nothing is saved." };
  const [{ count: docs }, { count: subs }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("project_id", projectId).or(`category.eq.${JSON.stringify(path)},category.like.${JSON.stringify(path + SEP + "%")}`),
    supabase.from("doc_folders").select("id", { count: "exact", head: true }).eq("project_id", projectId).like("path", `${path}${SEP}%`),
  ]);
  if ((docs ?? 0) > 0 || (subs ?? 0) > 0) return { error: "Move or delete what's inside first." };
  const { error } = await supabase.from("doc_folders").delete().eq("project_id", projectId).eq("path", path);
  revalidatePath(`/p/${projectId}`, "layout");
  return error ? { error: error.message } : { ok: "Folder removed." };
}

/** Rename a folder you added (fixes typos). Files and subfolders inside move with it. Builder only. */
export async function renameFolder(projectId: string, path: string, rawName: string): Promise<R> {
  const { supabase, profile, viewAs } = await getViewer();
  if (viewAs) return { error: "Preview mode — nothing is saved." };
  if (profile.role !== "builder") return { error: "Only TCB can rename folders." };
  if (STANDARD_NAMES.includes(path) || path === OTHER_FOLDER) return { error: "Standard folders keep their names on every job." };
  const name = cleanFolderName(rawName);
  if (!name) return { error: "Give the folder a name." };
  const parts = path.split(SEP);
  if (parts.at(-1) === name) return { ok: "Name unchanged." };
  const parent = parts.slice(0, -1).join(SEP);
  const next = parent ? `${parent}${SEP}${name}` : name;
  if (!parent && (STANDARD_NAMES.some((s) => s.toLowerCase() === name.toLowerCase()) || name.toLowerCase() === OTHER_FOLDER.toLowerCase())) return { error: "That name is a standard folder." };
  const caseOnly = next.toLowerCase() === path.toLowerCase();
  if (!caseOnly) {
    const { count } = await supabase.from("doc_folders").select("id", { count: "exact", head: true }).eq("project_id", projectId).ilike("path", next);
    if ((count ?? 0) > 0) return { error: "A folder with that name is already there." };
  }
  const swap = (p: string) => next + p.slice(path.length);
  const under = `${path}${SEP}%`;

  // Files first, so nothing is ever left pointing at a folder that's gone.
  const { data: docs, error: dErr } = await supabase.from("documents").select("id, category").eq("project_id", projectId)
    .or(`category.eq.${JSON.stringify(path)},category.like.${JSON.stringify(under)}`);
  if (dErr) return { error: dErr.message };
  for (const d of docs ?? []) {
    const { error } = await supabase.from("documents").update({ category: swap(d.category) }).eq("id", d.id);
    if (error) return { error: error.message };
  }
  const { data: folders, error: fErr } = await supabase.from("doc_folders").select("id, path").eq("project_id", projectId)
    .or(`path.eq.${JSON.stringify(path)},path.like.${JSON.stringify(under)}`);
  if (fErr) return { error: fErr.message };
  // Deepest first, so a subfolder never collides with its renamed parent mid-way.
  for (const f of (folders ?? []).sort((a, b) => b.path.length - a.path.length)) {
    const { error } = await supabase.from("doc_folders").update({ path: swap(f.path) }).eq("id", f.id);
    if (error) return { error: error.message };
  }
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: `Renamed to “${name}”.` };
}
