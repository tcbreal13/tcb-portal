"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { decideChangeOrder } from "../actions";

export function DecideButtons({ projectId, coId, code, amountLabel }: { projectId: string; coId: string; code: string; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<"approved" | "declined" | null>(null);

  const go = (d: "approved" | "declined") => start(async () => {
    const res = await decideChangeOrder(projectId, coId, d);
    if (res.error) setErr(res.error);
    setConfirm(null);
  });

  if (confirm) {
    return (
      <div className="btns" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 14 }}>{confirm === "approved" ? `Approve ${code} for ${amountLabel}? This changes the contract total.` : `Decline ${code}? Tim will be notified.`}</span>
        <button className="btn" disabled={pending} onClick={() => go(confirm)}>{pending ? "Saving…" : "Yes, " + (confirm === "approved" ? "approve" : "decline")}</button>
        <button className="btn ghost" disabled={pending} onClick={() => setConfirm(null)}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="btns" style={{ marginTop: 12 }}>
      <button className="btn" onClick={() => setConfirm("approved")}>Approve {amountLabel}</button>
      <button className="btn ghost" onClick={() => setConfirm("declined")}>Decline</button>
      <Link href={`/p/${projectId}/ask?q=${encodeURIComponent(`Explain ${code} and what happens if we decline it.`)}`} className="btn ghost">Ask Claude about this</Link>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
