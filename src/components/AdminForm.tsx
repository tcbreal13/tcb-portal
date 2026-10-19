"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";

type R = { error?: string; ok?: string } | null;

/** Generic form wrapper for builder actions: shows pending state, errors and a success line, resets on success when asked. */
export function AdminForm({ action, children, submit = "Save", reset = false, className }: {
  action: (prev: R, f: FormData) => Promise<R>; children: React.ReactNode; submit?: string; reset?: boolean; className?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (reset && state?.ok) ref.current?.reset(); }, [state, reset]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      <div className="btns" style={{ marginTop: 12 }}>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : submit}</button>
        {state?.error && <span className="err" style={{ margin: 0 }}>{state.error}</span>}
        {state?.ok && <span className="ok" style={{ margin: 0 }}>{state.ok}</span>}
      </div>
    </form>
  );
}

/** Small inline delete with a confirm step. */
export function DeleteButton({ onDelete, label = "Delete" }: { onDelete: () => Promise<unknown>; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn danger sm" disabled={pending} onClick={() => { if (confirm(`${label}? This can't be undone.`)) start(async () => { await onDelete(); }); }}>
      {pending ? "…" : label}
    </button>
  );
}
