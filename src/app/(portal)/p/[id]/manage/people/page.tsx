import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { inviteClient, removeMember, saveMemberAccess } from "../actions";
import { AccessPicker } from "./AccessPicker";
import { SECTIONS, TIERS, type Tier } from "@/lib/access";

export const metadata = { title: "Clients & access" };

export default async function People({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ email?: string; name?: string; req?: string }> }) {
  const { supabase } = await requireBuilder();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await getJobRecord(id);
  if (!r) notFound();
  const { data: members } = await supabase.from("project_members").select("user_id, member_role, access, profiles(full_name)").eq("project_id", id);
  const invite = inviteClient.bind(null, id);
  const { data: drafts } = await supabase.from("invite_jobs").select("invites!inner(id, full_name, email, status)").eq("project_id", id).eq("invites.status", "draft");

  return (
    <>
      <div><h1>Clients &amp; access</h1><p className="sub">Each person you invite gets an email with a link to set their password (or tick “Review before sending” to set it up first and activate later), and then sees only this job — and only the sections you tick.</p></div>
      <div className="panel">
        <h2>Invite someone</h2>
        <AdminForm action={invite} submit="Send invitation" reset>
          {sp.req && <input type="hidden" name="request_id" value={sp.req} />}
          <div className="grid2">
            <div><label htmlFor="full_name" style={{ marginTop: 0 }}>Name</label><input id="full_name" name="full_name" type="text" placeholder="Dana Hartwell" defaultValue={sp.name ?? ""} /></div>
            <div><label htmlFor="email" style={{ marginTop: 0 }}>Email</label><input id="email" name="email" type="email" required defaultValue={sp.email ?? ""} /></div>
          </div>
          <AccessPicker />
          <label className="typeopt" style={{ marginTop: 10 }}>
            <input type="checkbox" name="review" defaultChecked={!!sp.req} />
            <span className="box" aria-hidden="true" />
            <span>Review before sending — save as a draft, preview it, then activate and send their link</span>
          </label>
        </AdminForm>
      </div>
      {(drafts ?? []).length > 0 && (
        <div className="panel">
          <h2>Waiting for activation</h2>
          <div className="rows">
            {(drafts ?? []).map((d) => {
              const i = (Array.isArray(d.invites) ? d.invites[0] : d.invites) as { id: string; full_name: string; email: string };
              return (
                <div className="row" key={i.id}>
                  <div className="grow"><div className="t">{i.full_name || i.email}</div><div className="d">{i.email} · draft, no login yet</div></div>
                  <a className="btn sm" href={`/invites/${i.id}`}>Review &amp; activate</a>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="panel">
        <h2>Who has access</h2>
        <div className="rows">
          {(members ?? []).length === 0 && <p className="note" style={{ margin: 0 }}>No clients yet. Builders see every job automatically.</p>}
          {(members ?? []).map((m) => {
            const p = m.profiles as unknown as { full_name: string } | { full_name: string }[] | null;
            const name = (Array.isArray(p) ? p[0]?.full_name : p?.full_name) || "Invited (hasn’t signed in yet)";
            return (
              <details className="panel" key={m.user_id} style={{ marginBottom: 8 }}>
                <summary>{name} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {TIERS[(m.member_role as Tier) ?? "client"]?.label ?? "Client"} · {SECTIONS.filter((s) => (m.access ?? []).includes(s.key)).map((s) => s.label).join(", ") || "Messages only"}</span></summary>
                <AdminForm action={saveMemberAccess.bind(null, id, m.user_id)} submit="Save access">
                  <AccessPicker tier={m.member_role ?? "client"} access={m.access ?? []} />
                </AdminForm>
                <div style={{ marginTop: 8 }}><DeleteButton onDelete={removeMember.bind(null, id, m.user_id)} label="Remove access" /></div>
              </details>
            );
          })}
        </div>
        <p className="note">If someone didn&rsquo;t get their invitation, have them use &ldquo;Forgot password?&rdquo; on the sign-in page — it sends a fresh set-password link.</p>
      </div>
    </>
  );
}
