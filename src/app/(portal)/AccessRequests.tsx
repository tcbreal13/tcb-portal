"use client";

import { useTransition } from "react";
import Link from "next/link";
import { dismissRequest } from "./requests-actions";
import { reviewRequest } from "./invites/actions";

export interface AccessRequest { id: string; full_name: string; email: string; project_hint: string; message: string; created_at: string }
export interface DraftInvite { id: string; full_name: string; email: string; jobs: string[]; updated_at: string }

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Builder home: new requests to review, and drafts waiting for Tim to activate. Nobody gets a login until he does. */
export function AccessRequests({ requests, drafts }: { requests: AccessRequest[]; drafts: DraftInvite[] }) {
  const [pending, start] = useTransition();
  if (!requests.length && !drafts.length) return null;
  return (
    <div className="panel">
      <h2>Access requests</h2>
      <p className="sub" style={{ marginBottom: 10 }}>Review each one, choose their jobs and what they can see, then activate. Their login and activation link are only created when you activate.</p>
      <div className="rows">
        {requests.map((r) => (
          <div className="row" key={r.id}>
            <div className="grow">
              <div className="t">{r.full_name} · <span className="num" style={{ fontWeight: 400 }}>{r.email}</span> <span className="chip">New</span></div>
              <div className="d">{[r.project_hint, r.message].filter(Boolean).join(" — ") || "No details given"} · {day(r.created_at)}</div>
            </div>
            <button type="button" className="btn sm" disabled={pending} onClick={() => start(() => reviewRequest(r.id))}>Review &amp; set access</button>
            <button type="button" className="btn ghost sm" disabled={pending} onClick={() => { if (confirm(`Dismiss ${r.full_name}'s request? They won't be notified.`)) start(() => dismissRequest(r.id)); }}>Dismiss</button>
          </div>
        ))}
        {drafts.map((d) => (
          <div className="row" key={d.id}>
            <div className="grow">
              <div className="t">{d.full_name || d.email} · <span className="num" style={{ fontWeight: 400 }}>{d.email}</span> <span className="chip">Ready to activate</span></div>
              <div className="d">{d.jobs.join(", ") || "No job picked yet"} · saved {day(d.updated_at)}</div>
            </div>
            <Link href={`/invites/${d.id}`} className="btn sm">Review &amp; activate</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
