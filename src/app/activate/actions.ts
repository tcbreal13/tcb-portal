"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["invite", "recovery", "magiclink", "email"] as const;
type T = (typeof TYPES)[number];

/** Uses the one-time token only when the person presses the button, so link scanners can't burn it. */
export async function confirmActivation(f: FormData) {
  const token_hash = String(f.get("token_hash") ?? "");
  const type = String(f.get("type") ?? "") as T;
  const nextRaw = String(f.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  if (!token_hash || !TYPES.includes(type)) redirect("/login?error=link");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) redirect("/login?error=link");
  redirect(next);
}
