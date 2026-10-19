"use client";

import { useActionState, useEffect, useRef } from "react";
import { postMessage } from "../actions";

export function Compose({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(postMessage.bind(null, projectId), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (!pending && !state?.error) ref.current?.reset(); }, [pending, state]);
  return (
    <form ref={ref} action={action} className="compose">
      <input type="text" name="body" placeholder="Write a message" autoComplete="off" aria-label="Message" required />
      <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
      {state?.error && <p className="err">{state.error}</p>}
    </form>
  );
}
