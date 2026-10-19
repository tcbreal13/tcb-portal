"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { requestReset } from "../login/actions";

export default function ResetPage() {
  const [state, action, pending] = useActionState(requestReset, null);
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <form action={action} className="login panel">
        <div>
          <h1>Reset password</h1>
          <p className="sub">Enter the email on your account and we&rsquo;ll send a link to set a new password.</p>
        </div>
        <div>
          <label htmlFor="email" style={{ marginTop: 0 }}>Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {state?.error && <p className="err" role="alert">{state.error}</p>}
        {state?.ok && <p className="ok" role="status">If that address has an account, a reset link is on its way. Check your inbox and spam folder.</p>}
        <div className="btns">
          <button className="btn" disabled={pending || !!state?.ok}>{pending ? "Sending…" : "Send reset link"}</button>
          <Link href="/login" className="linkbtn">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}
