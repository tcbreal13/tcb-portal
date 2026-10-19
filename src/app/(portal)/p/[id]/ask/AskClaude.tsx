"use client";

import { useEffect, useRef, useState } from "react";
import { streamClaude } from "@/lib/stream";

interface Msg { role: "user" | "assistant"; content: string }

const CHIPS = [
  "When will the house be weather-tight?",
  "How much have we paid so far, and what is left?",
  "What decisions do you need from us this month?",
  "What happened on site this week?",
];

export function AskClaude({ projectId, initialQuestion }: { projectId: string; initialQuestion?: string }) {
  const [chat, setChat] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const asked = useRef(false);

  async function ask(q: string) {
    q = q.trim();
    if (!q || busy) return;
    setErr(undefined);
    const hist: Msg[] = [...chat, { role: "user", content: q }];
    setChat([...hist, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      await streamClaude({ kind: "ask", projectId, messages: hist }, (t) => setChat([...hist, { role: "assistant", content: t }]));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setChat(hist);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialQuestion && !asked.current) { asked.current = true; void ask(initialQuestion); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div className="panel">
      <div className="chips">
        {CHIPS.map((c) => <button key={c} className="chip" type="button" disabled={busy} onClick={() => ask(c)}>{c}</button>)}
      </div>
      <div className="thread">
        {chat.length === 0 && <p className="sub" style={{ margin: 0 }}>Ask anything about this job. Claude answers from the schedule, budget, change orders, selections and daily logs on this portal, and passes anything else to Tim.</p>}
        {chat.map((m, i) => (
          <div className={`msg${m.role === "user" ? " me" : ""}`} key={i}>
            <span className="meta">{m.role === "user" ? "You" : "Claude"}</span>{m.content || "Thinking…"}
          </div>
        ))}
      </div>
      <form className="compose" onSubmit={(e) => { e.preventDefault(); const v = inputRef.current?.value ?? ""; if (inputRef.current) inputRef.current.value = ""; void ask(v); }}>
        <input ref={inputRef} type="text" placeholder="Ask about schedule, budget, change orders…" autoComplete="off" aria-label="Question for Claude" />
        <button className="btn" disabled={busy}>Ask</button>
      </form>
      {err && <p className="err">{err}</p>}
      <p className="note">Answers come from this job&rsquo;s records only and can be wrong — confirm anything important with Tim.</p>
    </div>
  );
}
