"use client";

import { useState } from "react";

/** Typed e-signature: full name + today's date, with an explicit statement of what is being signed. */
export function SignatureBox({ statement, confirmLabel, defaultName, pending, onConfirm, onCancel, tone = "primary" }: {
  statement: string; confirmLabel: string; defaultName?: string; pending: boolean;
  onConfirm: (name: string) => void; onCancel: () => void; tone?: "primary" | "danger";
}) {
  const [name, setName] = useState(defaultName ?? "");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const ok = name.trim().length >= 3;
  return (
    <div className="panel" style={{ marginTop: 12, background: "var(--sunk)" }}>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>{statement}</p>
      <div className="grid2">
        <div>
          <label htmlFor="sigName" style={{ marginTop: 0 }}>Signature — type your full name</label>
          <input id="sigName" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name"
            style={{ fontFamily: "'Brush Script MT', 'Snell Roundhand', cursive", fontSize: 22, borderBottom: "2px solid var(--ink)", borderTop: 0, borderLeft: 0, borderRight: 0, background: "transparent" }} />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Date</label>
          <div className="num" style={{ padding: "10px 0", borderBottom: "2px solid var(--ink)" }}>{today}</div>
        </div>
      </div>
      <p className="note">By typing your name you agree this electronic signature has the same effect as a handwritten one. Your name, the date and time, and your account are recorded with this decision.</p>
      <div className="btns" style={{ marginTop: 8 }}>
        <button type="button" className={`btn${tone === "danger" ? " danger" : ""}`} disabled={pending || !ok} onClick={() => onConfirm(name)}>{pending ? "Saving…" : confirmLabel}</button>
        <button type="button" className="btn ghost" disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
