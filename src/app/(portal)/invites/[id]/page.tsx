import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { SECTIONS, TIERS, type Tier } from "@/lib/access";
import { InviteEditor } from "./InviteEditor";
import { cancelInvite, resendActivation } from "../actions";
import { AdminForm } from "@/components/AdminForm";

export const metadata = { title: "Review access" };

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireBuilder();
  const { id } = await params;
  const { data: inv } = await supabase.from("invites").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: jobs }, { data: projects }, { data: req }] = await Promise.all([
    supabase.from("invite_jobs").select("project_id, member_role, access").eq("invite_id", id),
    supabase.from("projects").select("id, name, address").eq("archived", false).order("name"),
    inv.request_id ? supabase.from("access_requests").select("project_hint, message, created_at").eq("id", inv.request_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const projName = (pid: string) => (projects ?? []).find((p) => p.id === pid)?.name ?? "Job";
  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" });

  return (
    <div className="stack">
      <div>
        <p className="sub" style={{ margin: 0 }}><Link href="/">← Portal home</Link></p>
        <h1>Review access · {inv.full_name || inv.email}</h1>
        <p className="sub">
          {inv.status === "draft" && "Draft — no login exists yet and nothing has been emailed. Set their jobs and access, preview, then activate."}
          {inv.status === "sent" && `Activated ${inv.sent_at ? when(inv.sent_at) : ""}. Their activation link has been emailed.`}
          {inv.status === "cancelled" && "Cancelled. Nothing was sent."}
        </p>
      </div>

      {req && (
        <div className="panel">
          <h2>Their request</h2>
          <p style={{ margin: 0 }}><strong>Project:</strong> {req.project_hint || "—"}</p>
          {req.message && <p style={{ margin: "6px 0 0" }}><strong>Message:</strong> {req.message}</p>}
          <p className="note">Received {when(req.created_at)}. They were emailed a confirmation that you&rsquo;ll review it.</p>
        </div>
      )}

      {inv.status === "draft" && (
        <>
          <InviteEditor inviteId={id} email={inv.email} fullName={inv.full_name} note={inv.note}
            jobs={(jobs ?? []).map((j) => ({ project_id: j.project_id, member_role: j.member_role, access: j.access ?? [] }))}
            projects={projects ?? []} />
          <form action={cancelInvite.bind(null, id)} style={{ marginTop: 6 }}>
            <button className="btn danger sm">Cancel this invite</button>
          </form>
        </>
      )}

      {inv.status === "sent" && (
        <div className="panel">
          <h2>Access granted</h2>
          <div className="rows">
            {(jobs ?? []).map((j) => (
              <div className="row" key={j.project_id}>
                <div className="grow">
                  <div className="t">{projName(j.project_id)}</div>
                  <div className="d">{TIERS[j.member_role as Tier]?.label ?? "Client"} · {SECTIONS.filter((s) => (j.access ?? []).includes(s.key)).map((s) => s.label).join(", ") || "Messages only"}</div>
                </div>
                <Link className="btn ghost sm" href={`/p/${j.project_id}/manage/people`}>Change access</Link>
              </div>
            ))}
          </div>
          <AdminForm action={async () => { "use server"; return resendActivation(id); }} submit="Resend activation link">
            <p className="note" style={{ marginBottom: 0 }}>Sends a fresh link (the old one stops working). Use it if theirs expired or got lost.</p>
          </AdminForm>
        </div>
      )}
    </div>
  );
}
