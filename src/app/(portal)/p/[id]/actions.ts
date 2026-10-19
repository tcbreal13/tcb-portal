"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { todayISO } from "@/lib/format";

/** Client (or builder) approves or declines a pending change order. RLS enforces pending → decided only. */
export async function decideChangeOrder(projectId: string, coId: string, decision: "approved" | "declined") {
  const { supabase, user } = await getViewer();
  const { error } = await supabase.from("change_orders")
    .update({ status: decision, decided_date: todayISO(), decided_by: user.id })
    .eq("id", coId).eq("project_id", projectId).eq("status", "pending");
  revalidatePath(`/p/${projectId}`, "layout");
  return { error: error?.message };
}

export async function chooseSelection(projectId: string, selectionId: string, optionId: string) {
  const { supabase } = await getViewer();
  const { error } = await supabase.from("selections")
    .update({ chosen_option_id: optionId, chosen_at: new Date().toISOString() })
    .eq("id", selectionId).eq("project_id", projectId);
  revalidatePath(`/p/${projectId}`, "layout");
  return { error: error?.message };
}

export async function postMessage(projectId: string, _prev: { error?: string } | null, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  const { supabase, user } = await getViewer();
  const { error } = await supabase.from("messages").insert({ project_id: projectId, sender_id: user.id, body });
  revalidatePath(`/p/${projectId}/messages`);
  return { error: error?.message };
}
