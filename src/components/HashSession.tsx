"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invite and recovery links sent from the Supabase dashboard return the session in the URL fragment
 * (#access_token=…&refresh_token=…&type=invite). Fragments never reach the server, so this picks them up
 * in the browser, stores the session in cookies, and sends the person to choose a password.
 */
export function HashSession() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;
    const p = new URLSearchParams(hash.slice(1));
    const access_token = p.get("access_token"), refresh_token = p.get("refresh_token"), type = p.get("type");
    if (!access_token || !refresh_token) return;
    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) return;
      history.replaceState(null, "", window.location.pathname);
      router.replace(type === "invite" || type === "recovery" || type === "signup" ? "/set-password" : "/");
      router.refresh();
    });
  }, [router]);
  return null;
}
