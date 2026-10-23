import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, listProjects } from "@/lib/data";
import { fdate } from "@/lib/format";
import { AccessRequests, type AccessRequest, type DraftInvite } from "./AccessRequests";
import { ProjectTypeTags } from "@/components/ProjectTypes";
import { UnsortedEmails, type InboundRow } from "./UnsortedEmails";

export default async function Home() {
  const { profile, supabase } = await getViewer();
  const projects = await listProjects();

  if (profile.role === "client" && projects.length === 1) redirect(`/p/${projects[0].id}`);

  let requests: AccessRequest[] = [];
  let drafts: DraftInvite[] = [];
  let inbound: InboundRow[] = [];
  if (profile.role === "builder") {
    const { data: ib } = await supabase.from("inbound_emails").select("id, received_at, from_addr, subject, body, status, extracted").in("status", ["unsorted", "ignored"]).order("received_at", { ascending: false }).limit(30);
    inbound = (ib ?? []) as InboundRow[];
    const { data } = await supabase.from("access_requests").select("id, full_name, email, project_hint, message, created_at").eq("status", "new").order("created_at", { ascending: false });
    // Drafts (incl. ones started from a request) waiting for Tim to activate; hide requests already under review.
    const { data: inv } = await supabase.from("invites").select("id, full_name, email, request_id, updated_at, invite_jobs(projects(name))").eq("status", "draft").order("updated_at", { ascending: false });
    const reviewing = new Set((inv ?? []).map((i) => i.request_id).filter(Boolean));
    requests = (data ?? []).filter((r) => !reviewing.has(r.id));
    drafts = (inv ?? []).map((i) => ({
      id: i.id, full_name: i.full_name, email: i.email, updated_at: i.updated_at,
      jobs: ((i.invite_jobs ?? []) as unknown as { projects: { name: string } | { name: string }[] | null }[])
        .map((j) => (Array.isArray(j.projects) ? j.projects[0]?.name : j.projects?.name) ?? "").filter(Boolean),
    }));
  }

  return (
    <main style={{ marginTop: 22 }}>
      <div>
        <h1>{profile.role === "builder" ? "Projects" : "Your projects"}</h1>
        {profile.role === "builder" && <p className="sub">Open a job to see what the client sees, or to post logs, billing and change orders.</p>}
      </div>
      {profile.role === "builder" && <UnsortedEmails emails={inbound} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />}
      {profile.role === "builder" && <AccessRequests requests={requests} drafts={drafts} />}
      {projects.length === 0 ? (
        <div className="panel">
          {profile.role === "builder"
            ? <p style={{ margin: 0 }}>No projects yet. Create the first one and then invite the client to it.</p>
            : <p style={{ margin: 0 }}>Your account isn&rsquo;t attached to a job yet. Tim will add you shortly; if you expected to see a project here, send him a note.</p>}
        </div>
      ) : (
        <div className="projlist">
          {projects.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="projcard">
              <div className="eyebrow">{p.address || "Address pending"}</div>
              <h3>{p.name}</h3>
              <ProjectTypeTags types={p.project_types} />
              <div className="d" style={{ fontSize: 13, color: "var(--muted)" }}>
                {p.current_phase || "Preconstruction"}{p.target_completion ? ` · target ${fdate(p.target_completion)}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
      {profile.role === "builder" && (
        <div className="btns"><Link href="/admin/new" className="btn">New project</Link></div>
      )}
    </main>
  );
}
