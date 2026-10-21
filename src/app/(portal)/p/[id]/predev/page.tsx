import { notFound } from "next/navigation";
import { getViewer, requireSection } from "@/lib/data";
import { fdate, fshort, todayISO } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { AGENCIES, PREDEV_STATUSES, loadPredev, money, statusInfo, type Activity, type Fee, type Proposed, type Track } from "@/lib/predev";
import { saveTrack, saveFee, deleteFee, addActivity, acceptActivity, rejectActivity, deleteActivity } from "./actions";

export const metadata = { title: "Pre-development" };

const sum = (xs: (number | null)[]) => xs.reduce<number>((t, x) => t + (x == null ? 0 : Number(x)), 0);

function proposedLines(p: Proposed): string[] {
  const out: string[] = [];
  if (p.status) out.push(`Status → ${statusInfo(p.status)[1]}`);
  if (p.submitted_date) out.push(`Submitted → ${fdate(p.submitted_date)}`);
  if (p.est_completion) out.push(`Est. completion → ${fdate(p.est_completion)}`);
  if (p.case_number) out.push(`Case # → ${p.case_number}`);
  if (p.contact && (p.contact.name || p.contact.email || p.contact.phone)) out.push(`Contact → ${[p.contact.name, p.contact.email, p.contact.phone].filter(Boolean).join(" · ")}`);
  if (p.fee_requested) out.push(`Fee requested → ${p.fee_requested.description ?? "Fee"} ${money(p.fee_requested.amount ?? null)}${p.fee_requested.date ? ` (${fshort(p.fee_requested.date)})` : ""}`);
  if (p.fee_paid) out.push(`Fee paid → ${money(p.fee_paid.amount ?? null)}${p.fee_paid.date ? ` on ${fshort(p.fee_paid.date)}` : ""}`);
  return out;
}

function AppliesPill({ t }: { t: Track }) {
  if (t.applies === true) return <Pill kind="info">Applies</Pill>;
  if (t.applies === false) return <Pill kind="idle">Not required</Pill>;
  return <Pill kind="idle">To be determined</Pill>;
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><div className="eyebrow" style={{ marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14.5 }}>{v || <span className="note" style={{ margin: 0 }}>—</span>}</div></div>;
}

export default async function Predev({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { supabase, profile }] = await Promise.all([requireSection(id, "predev"), getViewer()]);
  if (!r) notFound();
  const isBuilder = profile.role === "builder";
  const { tracks, fees, activity } = await loadPredev(supabase, id);
  const feesFor = (t: Track) => fees.filter((f) => t.id && f.track_id === t.id);
  const actsFor = (t: Track) => activity.filter((a) => t.id && a.track_id === t.id);
  const loose = activity.filter((a) => !a.track_id);
  const applying = tracks.filter((t) => t.applies === true);
  const reqTotal = sum(fees.map((f) => f.requested_amount)), paidTotal = sum(fees.map((f) => f.paid_amount));
  const nextDone = applying.map((t) => t.est_completion).filter(Boolean).sort().pop() ?? null;
  const pending = activity.filter((a) => a.state === "pending").length;

  return (
    <>
      <div>
        <h1>Pre-development</h1>
        <p className="sub">Entitlements and agency approvals for this site — what applies, where each submittal stands, fees, and the running record of correspondence.</p>
      </div>

      <div className="stats">
        <div className="stat"><span>Agencies involved</span><b>{applying.length} <span style={{ fontSize: 14 }}>of {tracks.length}</span></b><span>{applying.map((t) => AGENCIES.find((a) => a.key === t.agency)?.short ?? t.label).join(" · ") || "Not decided yet"}</span></div>
        <div className="stat"><span>Fees requested</span><b>{money(reqTotal)}</b></div>
        <div className="stat"><span>Fees paid</span><b>{money(paidTotal)}</b>{reqTotal - paidTotal > 0 && <span>{money(reqTotal - paidTotal)} outstanding</span>}</div>
        <div className="stat"><span>Last approval expected</span><b>{nextDone ? fdate(nextDone) : "—"}</b></div>
      </div>

      {isBuilder && (
        <div className="panel" style={{ borderColor: pending ? "var(--accent-ink)" : undefined }}>
          <div className="row nt">
            <div className="grow">
              <h2 style={{ margin: 0 }}>{pending ? `${pending} email ${pending === 1 ? "update" : "updates"} waiting for you` : "Email updates"}</h2>
              <div className="d" style={{ fontSize: 13.5, color: "var(--muted)" }}>Forward or CC agency emails to <b>permits@tcbbuilder.com</b>. Claude files each one under the right job and agency and drafts the update — nothing posts or changes until you accept it below.</div>
            </div>
          </div>
        </div>
      )}

      {loose.length > 0 && isBuilder && (
        <div className="panel">
          <h2>Needs an agency</h2>
          {loose.map((a) => <Suggestion key={a.id} id={id} a={a} tracks={tracks} />)}
        </div>
      )}

      {tracks.map((t) => {
        const info = statusInfo(t.status);
        const tf = feesFor(t), ta = actsFor(t);
        const agency = AGENCIES.find((a) => a.key === t.agency);
        const open = t.applies !== false;
        return (
          <div className="panel" key={t.agency} id={t.agency}>
            <div className="row nt">
              <div className="grow"><h2 style={{ margin: 0 }}>{t.label}</h2>{agency && isBuilder && <div className="d" style={{ fontSize: 12.5, color: "var(--muted)" }}>{agency.hint}</div>}</div>
              <AppliesPill t={t} />
              {t.applies === true && <Pill kind={info[2]}>{info[1]}</Pill>}
            </div>

            {t.applies === true && (
              <>
                <div className="grid4" style={{ marginTop: 12 }}>
                  <Detail k="Contact" v={t.contact_name && <>{t.contact_name}{t.contact_email && <><br /><a href={`mailto:${t.contact_email}`}>{t.contact_email}</a></>}{t.contact_phone && <><br />{t.contact_phone}</>}</>} />
                  <Detail k="Case / application #" v={t.case_number} />
                  <Detail k="Submitted" v={t.submitted_date && fdate(t.submitted_date)} />
                  <Detail k="Estimated completion" v={t.est_completion && fdate(t.est_completion)} />
                </div>
                {t.notes && <p style={{ margin: "12px 0 0", whiteSpace: "pre-wrap" }}>{t.notes}</p>}

                <div className="scroll" style={{ marginTop: 14 }}>
                  <table>
                    <thead><tr><th>Fee</th><th className="r">Requested</th><th>Date</th><th className="r">Paid</th><th>Date</th>{isBuilder && <th></th>}</tr></thead>
                    <tbody>
                      {tf.length === 0 && <tr><td colSpan={isBuilder ? 6 : 5} className="note">No fees yet.</td></tr>}
                      {tf.map((f) => (
                        <tr key={f.id}>
                          <td>{f.description || "Fee"}</td>
                          <td className="num r">{money(f.requested_amount)}</td><td className="num">{f.requested_date ? fshort(f.requested_date) : "—"}</td>
                          <td className="num r">{f.paid_amount != null ? money(f.paid_amount) : <Pill kind="warn">Unpaid</Pill>}</td><td className="num">{f.paid_date ? fshort(f.paid_date) : "—"}</td>
                          {isBuilder && <td><FeeEditor id={id} agency={t.agency} f={f} /></td>}
                        </tr>
                      ))}
                    </tbody>
                    {tf.length > 0 && <tfoot><tr><th>Total</th><th className="num r">{money(sum(tf.map((f) => f.requested_amount)))}</th><th></th><th className="num r">{money(sum(tf.map((f) => f.paid_amount)))}</th><th></th>{isBuilder && <th></th>}</tr></tfoot>}
                  </table>
                </div>
              </>
            )}
            {t.applies === false && <p className="note">Not required for this site.</p>}
            {t.applies === null && !isBuilder && <p className="note">TCB is confirming whether this applies.</p>}

            {(ta.length > 0 || (isBuilder && open)) && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow">Activity</div>
                {ta.filter((a) => a.state === "pending").map((a) => <Suggestion key={a.id} id={id} a={a} tracks={tracks} />)}
                <div className="rows">
                  {ta.filter((a) => a.state === "accepted").map((a) => (
                    <div className="row" key={a.id}>
                      <span className="num" style={{ width: 92, color: "var(--muted)" }}>{fshort(a.activity_date)}</span>
                      <div className="grow">{a.summary}{a.source === "email" && <div className="d" style={{ fontSize: 12.5, color: "var(--muted)" }}>From email{a.email_from ? ` · ${a.email_from}` : ""}{a.email_subject ? ` · “${a.email_subject}”` : ""}</div>}</div>
                      {isBuilder && <DeleteButton onDelete={deleteActivity.bind(null, id, a.id)} label="Remove" />}
                    </div>
                  ))}
                  {ta.filter((a) => a.state === "accepted").length === 0 && <p className="note" style={{ margin: "4px 0 0" }}>Nothing logged yet.</p>}
                </div>
              </div>
            )}

            {isBuilder && (
              <div className="btns" style={{ marginTop: 12, alignItems: "flex-start" }}>
                <details className="panel" style={{ flex: "1 1 100%" }}>
                  <summary>Edit {agency?.short ?? t.label}</summary>
                  <AdminForm action={saveTrack.bind(null, id, t.agency)} submit="Save">
                    <fieldset className="typepick" style={{ marginTop: 0 }}>
                      <legend>Does this apply to the project?</legend>
                      <div className="typegrid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                        {[["yes", "Yes"], ["no", "No"], ["", "Not decided"]].map(([v, l]) => (
                          <label key={v} className="typeopt"><input type="radio" name="applies" value={v} defaultChecked={(t.applies === true ? "yes" : t.applies === false ? "no" : "") === v} /><span className="box" style={{ borderRadius: "50%" }} /><span>{l}</span></label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid2">
                      <div><label>Contact person</label><input name="contact_name" type="text" defaultValue={t.contact_name} placeholder="Name, title" /></div>
                      <div><label>Status</label><select name="status" defaultValue={t.status}>{PREDEV_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                      <div><label>Contact email</label><input name="contact_email" type="email" defaultValue={t.contact_email} /></div>
                      <div><label>Contact phone</label><input name="contact_phone" type="text" defaultValue={t.contact_phone} /></div>
                      <div><label>Submittal date</label><input name="submitted_date" type="date" defaultValue={t.submitted_date ?? ""} /></div>
                      <div><label>Estimated completion</label><input name="est_completion" type="date" defaultValue={t.est_completion ?? ""} /></div>
                      <div><label>Case / application #</label><input name="case_number" type="text" defaultValue={t.case_number} /></div>
                    </div>
                    <label>Notes (the client sees these)</label>
                    <textarea name="notes" defaultValue={t.notes} style={{ minHeight: 70 }} />
                  </AdminForm>
                </details>
                <details className="panel" style={{ flex: "1 1 280px" }}>
                  <summary>Add a fee</summary>
                  <FeeForm id={id} agency={t.agency} />
                </details>
                <details className="panel" style={{ flex: "1 1 280px" }}>
                  <summary>Log activity</summary>
                  <AdminForm action={addActivity.bind(null, id, t.agency)} submit="Add" reset>
                    <label style={{ marginTop: 0 }}>Date</label><input name="activity_date" type="date" defaultValue={todayISO()} />
                    <label>What happened</label><textarea name="summary" required style={{ minHeight: 70 }} placeholder="Called the Coastal analyst; resubmittal accepted as complete." />
                  </AdminForm>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function FeeForm({ id, agency, f }: { id: string; agency: string; f?: Fee }) {
  return (
    <AdminForm action={saveFee.bind(null, id, agency)} submit={f ? "Save fee" : "Add fee"} reset={!f}>
      {f && <input type="hidden" name="fee_id" value={f.id} />}
      <label style={{ marginTop: 0 }}>Description</label><input name="description" type="text" defaultValue={f?.description ?? ""} placeholder="CDP application fee" />
      <div className="grid2">
        <div><label>Requested ($)</label><input name="requested_amount" type="text" inputMode="decimal" defaultValue={f?.requested_amount ?? ""} /></div>
        <div><label>Requested on</label><input name="requested_date" type="date" defaultValue={f?.requested_date ?? ""} /></div>
        <div><label>Paid ($)</label><input name="paid_amount" type="text" inputMode="decimal" defaultValue={f?.paid_amount ?? ""} /></div>
        <div><label>Paid on</label><input name="paid_date" type="date" defaultValue={f?.paid_date ?? ""} /></div>
      </div>
    </AdminForm>
  );
}

function FeeEditor({ id, agency, f }: { id: string; agency: string; f: Fee }) {
  return (
    <details>
      <summary className="linkbtn" style={{ listStyle: "none" }}>Edit</summary>
      <div className="panel" style={{ marginTop: 6, minWidth: 280 }}>
        <FeeForm id={id} agency={agency} f={f} />
        <div style={{ marginTop: 8 }}><DeleteButton onDelete={deleteFee.bind(null, id, f.id)} label="Delete fee" /></div>
      </div>
    </details>
  );
}

/** A pending email suggestion: Tim edits the wording/agency, chooses whether to apply the updates, then accepts or rejects. */
function Suggestion({ id, a, tracks }: { id: string; a: Activity; tracks: Track[] }) {
  const lines = proposedLines(a.proposed ?? {});
  const current = tracks.find((t) => t.id && t.id === a.track_id)?.agency ?? "";
  return (
    <div className="suggest">
      <div className="row nt" style={{ paddingBottom: 6 }}>
        <div className="grow"><Pill kind="warn">Waiting for you</Pill> <span className="d" style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 6 }}>From {a.email_from || "email"}{a.email_subject ? ` · “${a.email_subject}”` : ""}</span></div>
      </div>
      <AdminForm action={acceptActivity.bind(null, id, a.id)} submit="Accept">
        <div className="grid2">
          <div><label style={{ marginTop: 0 }}>Agency</label>
            <select name="agency" defaultValue={current} required>
              <option value="">— pick one —</option>
              {tracks.map((t) => <option key={t.agency} value={t.agency}>{t.label}</option>)}
            </select>
          </div>
          <div><label style={{ marginTop: 0 }}>Date</label><input name="activity_date" type="date" defaultValue={a.activity_date} /></div>
        </div>
        <label>Timeline entry (edit as you like — the client sees this)</label>
        <textarea name="summary" defaultValue={a.summary} style={{ minHeight: 60 }} />
        {lines.length > 0 && (
          <>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="apply_updates" defaultChecked style={{ width: "auto" }} /> Also update the card:</label>
            <ul style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 14 }}>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
          </>
        )}
      </AdminForm>
      <div style={{ marginTop: 6 }}><DeleteButton onDelete={rejectActivity.bind(null, id, a.id)} label="Reject" /></div>
    </div>
  );
}
