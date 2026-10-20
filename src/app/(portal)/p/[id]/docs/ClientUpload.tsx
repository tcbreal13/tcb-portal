"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { clientUpload, removeOwnUpload } from "../actions";

export function ClientUploadForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(clientUpload.bind(null, projectId), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      <label htmlFor="cu-file" style={{ marginTop: 0 }}>Share files with TCB</label>
      <div className="btns">
        <input id="cu-file" name="file" type="file" multiple required style={{ flex: "1 1 260px" }} />
        <button className="btn" disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
      </div>
      {state?.error && <p className="err">{state.error}</p>}
      {state?.ok && <p className="ok">{state.ok}</p>}
      <p className="note">PDFs, photos or documents up to 50 MB each. Tim is notified when you upload.</p>
    </form>
  );
}

export function RemoveOwnUpload({ projectId, docId }: { projectId: string; docId: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="btn ghost sm" disabled={pending} onClick={() => { if (confirm("Remove this file?")) start(async () => { await removeOwnUpload(projectId, docId); }); }}>{pending ? "…" : "Remove"}</button>;
}
