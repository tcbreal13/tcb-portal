"use server";

import { createClient } from "@/lib/supabase/server";
import { emailAccessRequested, emailRequestReceived } from "@/lib/email";

export async function requestAccess(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const project_hint = String(formData.get("project_hint") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (String(formData.get("website") ?? "")) return { ok: true }; // honeypot: bots fill it, people don't
  if (!full_name || !email.includes("@")) return { error: "Enter your name and a valid email." };

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert({ full_name, email, project_hint, message });
  if (error) return { error: "Couldn't send the request right now. Please email tim@tcbreal.com instead." };
  await emailAccessRequested({ fullName: full_name, email, projectHint: project_hint, message }).catch((e) => console.error(e));
  await emailRequestReceived({ fullName: full_name, email, projectHint: project_hint }).catch((e) => console.error(e));
  return { ok: true };
}
