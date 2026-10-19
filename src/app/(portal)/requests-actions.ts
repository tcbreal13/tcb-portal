"use server";

import { revalidatePath } from "next/cache";
import { requireBuilder } from "@/lib/builder";

export async function dismissRequest(id: string) {
  const { supabase } = await requireBuilder();
  await supabase.from("access_requests").update({ status: "done" }).eq("id", id);
  revalidatePath("/");
}
