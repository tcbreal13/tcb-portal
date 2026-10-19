"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="login panel">
      <div>
        <h1>Sign in</h1>
        <p className="sub">Each client signs in with their own email and password and sees only their job.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" style={{ marginTop: 0 }}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="err" role="alert">{state.error}</p>}
      <div className="btns">
        <button className="btn" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        <Link href="/reset-password" className="linkbtn">Forgot password?</Link>
      </div>
    </form>
  );
}
