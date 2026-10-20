"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { todayISO, signed } from "@/lib/format";
import { emailSelectionApproved, emailChangeOrderDecided, emailClientUploaded } from "@/lib/email";
import { CLIENT_FOLDER } from "@/lib/doc-folders";

/** Client (or builder) approves or declines a pending change order. RLS enforces pending → decided only. */
function cleanName(s: string) { return s.trim().replace(/\s+/g, " ").slice(0, 120); }

export async function decideChangeOrder(projectId: string, coId: string, decision: "approved" | "declined", signedName: string) {
  const name = cleanName(signedName);
  if (name.length < 3) return { error: "Type your full name to sign." };
  const { supabase, user, profile } = await getViewer();
  const { data: co, error } = await supabase.from("change_orders")
    .update({ status: decision, decided_date: todayISO(), decided_by: user.id, signed_name: name })
    .eq("id", coId).eq("project_id", projectId).eq("status", "pending")
    .select("code, title, amount, projects(name)").maybeSingle();
  revalidatePath(`/p/${projectId}`, "layout");
  if (error) return { error: error.message };
  if (co) {
    const pj = co.projects as unknown as { name: string } | { name: string }[] | null;
    const projectName = (Array.isArray(pj) ? pj[0]?.name : pj?.name) ?? "your project";
    await emailChangeOrderDecided({ clientEmail: user.email, clientName: profile.full_name, projectId, projectName, signedName: name, whenISO: new Date().toISOString(),
      code: co.code, title: co.title, amountLabel: signed(co.amount), decision }).catch((e) => console.error(e));
  }
  return {};
}

export async function chooseSelection(projectId: string, selectionId: string, optionId: string, signedName: string) {
  const name = cleanName(signedName);
  if (name.length < 3) return { error: "Type your full name to sign." };
  const { supabase, user, profile } = await getViewer();
  const whenISO = new Date().toISOString();
  const { data: sel, error } = await supabase.from("selections")
    .update({ chosen_option_id: optionId, chosen_at: whenISO, signed_name: name, signed_by: user.id })
    .eq("id", selectionId).eq("project_id", projectId)
    .select("item, projects(name)").maybeSingle();
  revalidatePath(`/p/${projectId}`, "layout");
  if (error) return { error: error.message };
  if (sel) {
    const { data: opt } = await supabase.from("selection_options").select("name, price_delta").eq("id", optionId).maybeSingle();
    const pj = sel.projects as unknown as { name: string } | { name: string }[] | null;
    const projectName = (Array.isArray(pj) ? pj[0]?.name : pj?.name) ?? "your project";
    await emailSelectionApproved({ clientEmail: user.email, clientName: profile.full_name, projectId, projectName, signedName: name, whenISO,
      item: sel.item, option: opt?.name ?? "", priceLabel: signed(opt?.price_delta ?? 0) }).catch((e) => console.error(e));
  }
  return {};
}

/** Client uploads into the "Client uploads" folder of their own job. */
export async function clientUpload(projectId: string, _prev: { error?: string; ok?: string } | null, formData: FormData) {
  const files = formData.getAll("file").filter((x): x is File => x instanceof File && x.size > 0);
  if (!files.length) return { error: "Choose at least one file." };
  const { supabase, user, profile } = await getViewer();
  const failures: string[] = []; const titles: string[] = [];
  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) { failures.push(`${file.name} (over 50 MB)`); continue; }
    const path = `${projectId}/client-uploads/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80)}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (upErr) { failures.push(`${file.name} (${upErr.message})`); continue; }
    const title = file.name.replace(/\.[^.]+$/, "");
    const { error } = await supabase.from("documents").insert({ project_id: projectId, title, category: CLIENT_FOLDER, doc_date: todayISO(), storage_path: path, uploaded_by: user.id });
    if (error) failures.push(`${file.name} (${error.message})`); else titles.push(title);
  }
  revalidatePath(`/p/${projectId}`, "layout");
  if (titles.length) {
    const { data: p } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
    await emailClientUploaded({ clientEmail: user.email, clientName: profile.full_name, projectId, projectName: p?.name ?? "a project", titles }).catch((e) => console.error(e));
  }
  return failures.length ? { error: `${titles.length} uploaded; failed: ${failures.join(", ")}` } : { ok: `${titles.length} file${titles.length === 1 ? "" : "s"} shared with Tim.` };
}

export async function removeOwnUpload(projectId: string, docId: string) {
  const { supabase, user } = await getViewer();
  const { data } = await supabase.from("documents").select("storage_path, uploaded_by").eq("id", docId).eq("project_id", projectId).maybeSingle();
  if (!data || data.uploaded_by !== user.id) return { error: "You can only remove files you uploaded." };
  await supabase.storage.from("documents").remove([data.storage_path]);
  await supabase.from("documents").delete().eq("id", docId);
  revalidatePath(`/p/${projectId}`, "layout");
  return {};
}

export async function postMessage(projectId: string, _prev: { error?: string } | null, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  const { supabase, user } = await getViewer();
  const { error } = await supabase.from("messages").insert({ project_id: projectId, sender_id: user.id, body });
  revalidatePath(`/p/${projectId}/messages`);
  return { error: error?.message };
}
