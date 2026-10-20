import type { SupabaseClient } from "@supabase/supabase-js";
import { PAYAPP_DOCS, type PayApp } from "@/lib/types";

export interface PayAppLink { label: string; url: string }

/** One-hour signed links for every document attached to the given pay apps, keyed by pay app id. */
export async function signPayAppDocs(supabase: SupabaseClient, payApps: PayApp[]): Promise<Map<string, PayAppLink[]>> {
  const paths: string[] = [];
  for (const p of payApps) for (const [col] of PAYAPP_DOCS) if (p[col]) paths.push(p[col] as string);
  const out = new Map<string, PayAppLink[]>();
  if (!paths.length) return out;
  const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
  const urlByPath = new Map((data ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl as string]));
  for (const p of payApps) {
    const links: PayAppLink[] = [];
    for (const [col, label] of PAYAPP_DOCS) {
      const path = p[col];
      const url = path ? urlByPath.get(path) : undefined;
      if (url) links.push({ label, url });
    }
    if (links.length) out.set(p.id, links);
  }
  return out;
}
