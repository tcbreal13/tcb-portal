import { createClient } from "@supabase/supabase-js";

/** Service-role client. Server only. Bypasses RLS — use for inviting users and nothing else. */
export function createAdminClient() {
  // Trim: a pasted key often carries a trailing space or line break, which Supabase rejects as "Invalid API key".
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s+/g, "");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
