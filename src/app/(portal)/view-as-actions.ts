"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, VIEW_AS_COOKIE } from "@/lib/data";
import { isTier, ALL_SECTIONS } from "@/lib/access";

/** Builder-only: preview the portal as a role. `back` is where to land afterwards. */
export async function startViewAs(tier: string, back: string) {
  const { realRole } = await getViewer();
  if (realRole !== "builder" || !isTier(tier)) redirect("/");
  (await cookies()).set(VIEW_AS_COOKIE, tier, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8 });
  redirect(back.startsWith("/") ? back : "/");
}

/** Builder-only: preview one job exactly as an invite under review would see it, then return to the invite. */
export async function previewInviteJob(projectId: string, tier: string, sections: string[], returnTo: string) {
  const { realRole } = await getViewer();
  if (realRole !== "builder" || !isTier(tier)) redirect("/");
  const secs = sections.filter((k) => (ALL_SECTIONS as string[]).includes(k)).join(",");
  const back = returnTo.startsWith("/") ? returnTo : "/";
  (await cookies()).set(VIEW_AS_COOKIE, `${tier}~${secs}~${back}`, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8 });
  redirect(`/p/${projectId}`);
}

export async function stopViewAs() {
  const jar = await cookies();
  const back = (jar.get(VIEW_AS_COOKIE)?.value ?? "").split("~")[2];
  jar.delete(VIEW_AS_COOKIE);
  if (back?.startsWith("/") && !back.startsWith("//")) redirect(back);
  // Back to the same job's Clients & access page if we came from a job.
  const ref = (await headers()).get("referer") ?? "";
  const m = ref.match(/\/p\/[0-9a-f-]+/);
  redirect(m ? `${m[0]}/manage/people` : "/");
}
