"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { requestAccess } from "./actions";

export default function RequestAccessPage() {
  const [state, action, pending] = useActionState(requestAccess, null);
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <form action={action} className="login panel">
        <div>
          <h1>Request access</h1>
          <p className="sub">Portal accounts are set up by TCB for each project. Tell us who you are and we&rsquo;ll send you an invitation.</p>
        </div>
        {state?.ok ? (
          <p className="ok" role="status" style={{ margin: 0 }}>Thanks — Tim has your request. We&rsquo;ve emailed you a confirmation; once Tim has set up your access you&rsquo;ll get a second email with your activation link.</p>
        ) : (
          <>
            <div>
              <label htmlFor="full_name" style={{ marginTop: 0 }}>Your name</label>
              <input id="full_name" name="full_name" type="text" autoComplete="name" required />
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
              <label htmlFor="project_hint">Project address</label>
              <input id="project_hint" name="project_hint" type="text" placeholder="Street address of the job" />
              <label htmlFor="message">Anything else (optional)</label>
              <textarea id="message" name="message" style={{ minHeight: 90 }} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
            </div>
            {state?.error && <p className="err" role="alert">{state.error}</p>}
            <div className="btns">
              <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send request"}</button>
              <Link href="/login" className="linkbtn">Back to sign in</Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
