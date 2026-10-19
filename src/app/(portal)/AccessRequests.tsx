"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { dismissRequest } from "./requests-actions";

export interface AccessRequest { id: string; full_name: string; email: string; project_hint: string; message: string; created_at: string }
interface Proj { id: string; name: string }

export function AccessRequests({ requests, projects }: { requests: AccessRequest[]; projects: Proj[] }) {
  const [pending, start] = useTransition();
  const [pick, setPick] = useState<Record<string, string>>({});
  if (!requests.length) return null;
  return (
    <div className="panel">
      <h2>Access requests</h2>
      <p className="sub" style={{ marginBottom: 10 }}>People who asked for a login from the sign-in page. Pick their job and invite them, or dismiss.</p>
      <div className="rows">
        {requests.map((r) => {
          const pid = pick[r.id] ?? projects[0]?.id ?? "";
          const q = new URLSearchParams({ email: r.email, name: r.full_name, req: r.id }).toString();
          return (
            <div className="row" key={r.id}>
              <div className="grow">
                <div className="t">{r.full_name} · <span className="num" style={{ fontWeight: 400 }}>{r.email}</span></div>
                <div className="d">{[r.project_hint, r.message].filter(Boolean).join(" — ") || "No details given"} · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <select value={pid} onChange={(e) => setPick({ ...pick, [r.id]: e.target.value })} style={{ width: "auto" }} aria-label="Project">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Link href={pid ? `/p/${pid}/manage/people?${q}` : "/admin/new"} className="btn sm">Invite</Link>
              <button type="button" className="btn ghost sm" disabled={pending} onClick={() => start(() => dismissRequest(r.id))}>Dismiss</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
