import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, listProjects } from "@/lib/data";
import { fdate } from "@/lib/format";

export default async function Home() {
  const { profile } = await getViewer();
  const projects = await listProjects();

  if (profile.role === "client" && projects.length === 1) redirect(`/p/${projects[0].id}`);

  return (
    <main style={{ marginTop: 22 }}>
      <div>
        <h1>{profile.role === "builder" ? "Projects" : "Your projects"}</h1>
        {profile.role === "builder" && <p className="sub">Open a job to see what the client sees, or to post logs, billing and change orders.</p>}
      </div>
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
