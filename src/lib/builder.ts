import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";

/** Pages and actions for Tim only. Clients are sent to their overview. RLS blocks the writes anyway; this keeps the UI honest. */
export async function requireBuilder() {
  const v = await getViewer();
  if (v.profile.role !== "builder") redirect("/");
  return v;
}

export function num(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").replace(/[^0-9.-]/g, "");
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}
export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
export function dateOrNull(formData: FormData, key: string): string | null {
  const s = str(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
export function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
}
