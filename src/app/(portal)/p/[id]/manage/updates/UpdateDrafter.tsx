"use client";

import { useState } from "react";
import { streamClaude } from "@/lib/stream";

export function UpdateDrafter({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  async function draft() {
    setErr(undefined); setBusy(true);
    try { await streamClaude({ kind: "update", projectId, notes }, setBody); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not draft."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <label htmlFor="notes" style={{ marginTop: 0 }}>Anything Claude should know that isn&rsquo;t in the logs (optional)</label>
      <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tile delivery slipped a week; still weather-tight by Oct 30." />
      <div className="btns" style={{ marginTop: 10 }}>
        <button type="button" className="btn ghost" disabled={busy} onClick={draft}>{busy ? "Drafting…" : "Draft from this week’s logs"}</button>
        {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      </div>
      <label htmlFor="body">Update</label>
      <textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 220 }} required placeholder="The draft appears here. Edit it freely before posting." />
    </>
  );
}
