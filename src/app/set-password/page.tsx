"use client";

import { useActionState } from "react";
import { Brand } from "@/components/Brand";
import { setPassword } from "../login/actions";

export default function SetPasswordPage() {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <form action={action} className="login panel">
        <div>
          <h1>Choose a password</h1>
          <p className="sub">At least 10 characters. You&rsquo;ll use this with your email to sign in to the portal.</p>
        </div>
        <div>
          <label htmlFor="password" style={{ marginTop: 0 }}>New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        {state?.error && <p className="err" role="alert">{state.error}</p>}
        <div className="btns"><button className="btn" disabled={pending}>{pending ? "Saving…" : "Save and continue"}</button></div>
      </form>
    </div>
  );
}
