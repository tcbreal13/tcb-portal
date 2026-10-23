import { NextResponse } from "next/server";

/** Reports which settings are present (never their values) and whether Supabase answers. Safe to leave public. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    NEXT_PUBLIC_SUPABASE_URL_looks_valid: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
  };
  let supabase: string = "not checked";
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(`${url.trim().replace(/\/$/, "")}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, cache: "no-store" });
      supabase = `${r.status} ${r.ok ? "ok" : "error"}`;
    } catch (e) {
      supabase = `unreachable: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  // Service key: report only its kind and whether an admin call works — never any part of the value.
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const sk = raw.replace(/\s+/g, "");
  let service_key: Record<string, string | boolean> = { present: !!raw };
  if (sk) {
    let kind = sk.startsWith("sb_secret_") ? "secret key (new format)" : sk.startsWith("sb_publishable_") ? "PUBLISHABLE key — wrong one" : "unknown";
    if (sk.startsWith("eyJ")) {
      try { const role = JSON.parse(Buffer.from(sk.split(".")[1], "base64url").toString()).role; kind = role === "service_role" ? "service_role JWT" : `JWT with role "${role}" — wrong one`; } catch { kind = "malformed JWT"; }
    }
    let admin = "not checked";
    try {
      const r = await fetch(`${url.trim().replace(/\/$/, "")}/auth/v1/admin/users?per_page=1`, { headers: { apikey: sk, Authorization: `Bearer ${sk}` }, cache: "no-store" });
      admin = `${r.status} ${r.ok ? "ok" : "rejected"}`;
    } catch (e) { admin = `unreachable: ${e instanceof Error ? e.message : String(e)}`; }
    service_key = { present: true, had_whitespace: raw !== sk, kind, admin };
  }
  return NextResponse.json({ env, supabase, service_key });
}
