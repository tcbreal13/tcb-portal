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
