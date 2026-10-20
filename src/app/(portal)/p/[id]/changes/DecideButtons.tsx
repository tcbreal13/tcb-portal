"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { decideChangeOrder } from "../actions";
import { SignatureBox } from "@/components/SignatureBox";

export function DecideButtons({ projectId, coId, code, title, amountLabel, defaultName }: { projectId: string; coId: string; code: string; title: string; amountLabel: string; defaultName?: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  const [mode, setMode] = useState<"approved" | "declined" | null>(null);

  if (mode) {
    return (
      <div>
        <SignatureBox
          statement={mode === "approved"
            ? `I approve change order ${code}, "${title}", for ${amountLabel}. I understand this amount is added to the contract and TCB may proceed with the work.`
            : `I decline change order ${code}, "${title}" (${amountLabel}). TCB will not proceed with this scope.`}
          confirmLabel={mode === "approved" ? "Sign and approve" : "Sign and decline"} tone={mode === "approved" ? "primary" : "danger"}
          defaultName={defaultName} pending={pending}
          onConfirm={(n) => start(async () => { const r = await decideChangeOrder(projectId, coId, mode, n); if (r.error) setErr(r.error); else setMode(null); })}
          onCancel={() => setMode(null)} />
        {err && <p className="err">{err}</p>}
      </div>
    );
  }
  return (
    <div className="btns" style={{ marginTop: 12 }}>
      <button className="btn" onClick={() => setMode("approved")}>Approve {amountLabel}</button>
      <button className="btn ghost" onClick={() => setMode("declined")}>Decline</button>
      <Link href={`/p/${projectId}/ask?q=${encodeURIComponent(`Explain ${code} and what happens if we decline it.`)}`} className="btn ghost">Ask Claude about this</Link>
    </div>
  );
}
