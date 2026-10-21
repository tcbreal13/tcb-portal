import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENCIES } from "@/lib/predev";

/** Make sure the track row exists (the page shows unsaved defaults) and return its id. */
export async function ensureTrack(supabase: SupabaseClient, projectId: string, agency: string): Promise<string> {
  const { data: found } = await supabase.from("predev_tracks").select("id").eq("project_id", projectId).eq("agency", agency).maybeSingle();
  if (found) return found.id;
  const a = AGENCIES.find((x) => x.key === agency);
  const { data, error } = await supabase.from("predev_tracks")
    .insert({ project_id: projectId, agency, label: a?.label ?? agency, sort_order: a ? AGENCIES.indexOf(a) : 99 })
    .select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the agency track.");
  return data.id;
}

