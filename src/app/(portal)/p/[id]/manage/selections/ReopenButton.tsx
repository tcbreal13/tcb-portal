"use client";

import { useTransition } from "react";

export function ReopenButton({ onReopen }: { onReopen: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return <button type="button" className="btn ghost sm" disabled={pending} onClick={() => start(onReopen)}>{pending ? "…" : "Reopen"}</button>;
}
