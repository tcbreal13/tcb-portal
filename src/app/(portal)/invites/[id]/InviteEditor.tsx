"use client";

import { useActionState, useState } from "react";
import { AccessPicker } from "../../p/[id]/manage/people/AccessPicker";
import { submitInvite } from "../actions";
import { TIERS } from "@/lib/access";

type R = { error?: string; ok?: string } | null;
export interface EditorJob { project_id: string; member_role: string; access: string[] }
interface Proj { id: string; name: string; address: string | null }

/** Everything Tim sets before activating: who, which jobs, role + sections per job, and a personal note. */
export function InviteEditor({ inviteId, email, fullName, note, jobs: initialJobs, projects }: {
  inviteId: string; email: string; fullName: string; note: string; jobs: EditorJob[]; projects: Proj[];
}) {
  const [state, run, pending] = useActionState(submitInvite.bind(null, inviteId) as (p: R, f: FormData) => Promise<R>, null);
  const [jobs, setJobs] = useState<EditorJob[]>(initialJobs);
  const free = projects.filter((p) => !jobs.some((j) => j.project_id === p.id));
  const [pick, setPick] = useState("");
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "Job";

  return (
    <form action={run}>
      <div className="panel">
        <h2>Who</h2>
        <div className="grid2">
          <div><label htmlFor="full_name" style={{ marginTop: 0 }}>Name</label><input id="full_name" name="full_name" type="text" defaultValue={fullName} /></div>
          <div><label htmlFor="email" style={{ marginTop: 0 }}>Email</label><input id="email" name="email" type="email" required defaultValue={email} /></div>
        </div>
      </div>

      <div className="panel">
        <h2>Jobs and access</h2>
        {jobs.length === 0 && <p className="note" style={{ marginTop: 0 }}>No job yet. Add the job (or jobs) this person should see.</p>}
        {jobs.map((j) => (
          <div key={j.project_id} className="panel" style={{ marginBottom: 10 }}>
            <input type="hidden" name="job" value={j.project_id} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ flex: 1 }}>{name(j.project_id)}</strong>
              <button className="btn ghost sm" name="intent" value={`preview:${j.project_id}`} disabled={pending} title="Saves the draft, then shows this job exactly as they'll see it">Preview as them</button>
              <button type="button" className="btn ghost sm" onClick={() => setJobs(jobs.filter((x) => x.project_id !== j.project_id))}>Remove</button>
            </div>
            <AccessPicker jobId={j.project_id} tier={j.member_role} access={j.access} />
          </div>
        ))}
        {free.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: "auto", minWidth: 220 }} aria-label="Add a job">
              <option value="">Add a job…</option>
              {free.map((p) => <option key={p.id} value={p.id}>{p.name}{p.address ? ` — ${p.address}` : ""}</option>)}
            </select>
            <button type="button" className="btn sm" disabled={!pick} onClick={() => { setJobs([...jobs, { project_id: pick, member_role: "client", access: [...TIERS.client.sections] }]); setPick(""); }}>Add</button>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Personal note <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></h2>
        <textarea name="note" defaultValue={note} style={{ minHeight: 80 }} placeholder="e.g. Welcome aboard — you'll find the schedule and selections for your project here." />
        <p className="note">Shown at the top of their activation email.</p>
      </div>

      <div className="btns" style={{ marginTop: 4 }}>
        <button className="btn ghost" name="intent" value="save" disabled={pending}>{pending ? "Saving…" : "Save draft"}</button>
        <button className="btn" name="intent" value="activate" disabled={pending || jobs.length === 0}
          onClick={(e) => { if (!confirm("Create their login and email the activation link now?")) e.preventDefault(); }}>
          {pending ? "Working…" : "Activate & send link"}
        </button>
        {state?.error && <span className="err" style={{ margin: 0 }}>{state.error}</span>}
        {state?.ok && <span className="ok" style={{ margin: 0 }}>{state.ok}</span>}
      </div>
      <p className="note">Nothing reaches them until you press Activate. Save draft and Preview only save your choices here.</p>
    </form>
  );
}
