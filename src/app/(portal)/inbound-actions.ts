"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBuilder, str } from "@/lib/builder";
import { ensureTrack } from "@/lib/predev-server";
import type { Proposed } from "@/lib/predev";

type R = { error?: string; ok?: string } | null;

/** File an unmatched agency email under a job (and agency) as a pending suggestion, then open that job's tracker. */
export async function fileInbound(emailId: string, _p: R, f: FormData): Promise<R> {
  const { supabase } = await requireBuilder();
  const projectId = str(f, "project_id"), agency = str(f, "agency");
  if (!projectId) return { error: "Pick a job." };
  const { data: e } = await supabase.from("inbound_emails").select("*").eq("id", emailId).maybeSingle();
  if (!e) return { error: "That email is gone." };
  const ex = (e.extracted ?? {}) as { summary?: string; activity_date?: string; proposed?: Proposed };
  const trackId = agency ? await ensureTrack(supabase, projectId, agency) : null;
  const { error } = await supabase.from("predev_activity").insert({
    project_id: projectId, track_id: trackId, activity_date: ex.activity_date ?? String(e.received_at).slice(0, 10),
    summary: ex.summary || e.subject || "Email received", source: "email", state: "pending", email_id: e.id,
    email_from: e.from_addr, email_subject: e.subject, proposed: ex.proposed ?? {},
  });
  if (error) return { error: error.message };
  await supabase.from("inbound_emails").update({ status: "suggested", project_id: projectId, agency: agency || null }).eq("id", emailId);
  revalidatePath("/");
  redirect(`/p/${projectId}/predev`);
}

export async function dismissInbound(emailId: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("inbound_emails").update({ status: "dismissed" }).eq("id", emailId);
  revalidatePath("/");
}
