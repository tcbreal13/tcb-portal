"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { directUpload, type UploadTarget } from "@/lib/direct-upload";

type R = { error?: string; ok?: string } | null;

/** Generic form wrapper for builder actions: shows pending state, errors and a success line, resets on success when asked. */
export function AdminForm({ action, children, submit = "Save", reset = false, className, uploadTo }: {
  action: (prev: R, f: FormData) => Promise<R>; children: React.ReactNode; submit?: string; reset?: boolean; className?: string;
  /** When set, chosen files go straight from the browser to storage before the form is saved (no size cap from Vercel). */
  uploadTo?: UploadTarget;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [uploading, setUploading] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (reset && state?.ok) ref.current?.reset(); }, [state, reset]);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!uploadTo) return;
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null);
    try { await directUpload(fd, uploadTo, setUploading); } finally { setUploading(null); }
    startTransition(() => run(fd));
  }
  const busy = pending || !!uploading;
  return (
    <form ref={ref} action={run} onSubmit={uploadTo ? onSubmit : undefined} className={className}>
      {children}
      <div className="btns" style={{ marginTop: 12 }}>
        <button className="btn" disabled={busy}>{uploading ?? (pending ? "Saving…" : submit)}</button>
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
