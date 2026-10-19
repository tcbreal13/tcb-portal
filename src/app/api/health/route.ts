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
  return NextResponse.json({ env, supabase });
}
