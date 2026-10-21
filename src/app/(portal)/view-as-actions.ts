"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, VIEW_AS_COOKIE } from "@/lib/data";
import { isTier } from "@/lib/access";

/** Builder-only: preview the portal as a role. `back` is where to land afterwards. */
export async function startViewAs(tier: string, back: string) {
  const { realRole } = await getViewer();
  if (realRole !== "builder" || !isTier(tier)) redirect("/");
  (await cookies()).set(VIEW_AS_COOKIE, tier, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8 });
  redirect(back.startsWith("/") ? back : "/");
}

export async function stopViewAs() {
  (await cookies()).delete(VIEW_AS_COOKIE);
  // Back to the same job's Clients & access page if we came from a job.
  const ref = (await headers()).get("referer") ?? "";
  const m = ref.match(/\/p\/[0-9a-f-]+/);
  redirect(m ? `${m[0]}/manage/people` : "/");
}
