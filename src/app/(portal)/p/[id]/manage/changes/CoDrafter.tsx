"use client";

import { useState } from "react";
import { streamClaude } from "@/lib/stream";

/** Title/price/notes inputs plus a "write the description" button that streams Claude's draft into the description box. */
export function CoDrafter({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  async function draft() {
    if (!title.trim() || !notes.trim()) { setErr("Add a title and your notes first."); return; }
    setErr(undefined); setBusy(true);
    try { await streamClaude({ kind: "co", projectId, title, amount, notes }, setDesc); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not draft."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <label htmlFor="title" style={{ marginTop: 0 }}>What changed</label>
      <input id="title" name="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add EV charger circuit and conduit at garage" required />
      <div className="grid2">
        <div><label htmlFor="amount">Price (USD, negative for a credit)</label><input id="amount" name="amount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4800" /></div>
        <div><label htmlFor="sent_date">Sent date</label><input id="sent_date" name="sent_date" type="date" /></div>
      </div>
      <label htmlFor="notes">Your rough notes (not shown to the client)</label>
      <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Client asked at Sep 24 walk. 60A circuit, 1 inch conduit, panel has capacity. No schedule impact if approved before rough electrical." />
      <div className="btns" style={{ marginTop: 10 }}>
        <button type="button" className="btn ghost" disabled={busy} onClick={draft}>{busy ? "Writing…" : "Have Claude write the description"}</button>
        {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      </div>
      <label htmlFor="description">Client-facing description</label>
      <textarea id="description" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="What is changing, why, and any schedule impact. Edit freely before sending." />
    </>
  );
}
