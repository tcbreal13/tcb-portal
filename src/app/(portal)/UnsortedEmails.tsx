import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { AGENCIES } from "@/lib/predev";
import { fshort } from "@/lib/format";
import { fileInbound, dismissInbound } from "./inbound-actions";

export interface InboundRow { id: string; received_at: string; from_addr: string; subject: string; body: string; status: string; extracted: { summary?: string } | null }

/** Builder home: agency emails Claude couldn't file (or thought weren't about permits). */
export function UnsortedEmails({ emails, projects }: { emails: InboundRow[]; projects: { id: string; name: string }[] }) {
  if (!emails.length) return null;
  return (
    <div className="panel" style={{ borderColor: "var(--accent-ink)" }}>
      <h2>Agency emails to file <span className="count">{emails.length}</span></h2>
      <p className="sub" style={{ marginBottom: 6 }}>Sent to permits@tcbbuilder.com but not matched to a job{emails.some((e) => e.status === "ignored") ? " (or Claude thought they weren't about permits)" : ""}.</p>
      {emails.map((e) => (
        <details className="panel" key={e.id} style={{ marginBottom: 8 }}>
          <summary>{e.subject || "(no subject)"} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {e.from_addr} · {fshort(e.received_at.slice(0, 10))}{e.status === "ignored" ? " · looked unrelated" : ""}</span></summary>
          {e.extracted?.summary && <p style={{ margin: "8px 0" }}><b>Claude&rsquo;s read:</b> {e.extracted.summary}</p>}
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--body)", fontSize: 13, maxHeight: 220, overflow: "auto", background: "var(--sunk)", padding: 10, margin: "8px 0" }}>{e.body.slice(0, 4000)}</pre>
          <AdminForm action={fileInbound.bind(null, e.id)} submit="File it">
            <div className="grid2">
              <div><label style={{ marginTop: 0 }}>Job</label><select name="project_id" required defaultValue=""><option value="">— pick a job —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label style={{ marginTop: 0 }}>Agency</label><select name="agency" defaultValue=""><option value="">— not sure —</option>{AGENCIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
            </div>
          </AdminForm>
          <div style={{ marginTop: 6 }}><DeleteButton onDelete={dismissInbound.bind(null, e.id)} label="Dismiss" /></div>
        </details>
      ))}
    </div>
  );
}
