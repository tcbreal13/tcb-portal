/**
 * Transactional email via Resend (https://resend.com). Needs RESEND_API_KEY and EMAIL_FROM in Vercel.
 * If they're missing the portal keeps working and just logs that no email went out.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const BUILDER_EMAIL = process.env.BUILDER_NOTIFY_EMAIL ?? "tim@tcbreal.com";

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#242424">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-top:4px solid #FFE30F">
    <div style="padding:20px 24px 6px;font:900 26px 'Arial Black',Arial,sans-serif;letter-spacing:.04em">TCB<div style="font:500 10px Arial;letter-spacing:.2em;color:#6b6b6b;margin-top:2px">DEVELOPMENT LTD. · CLIENT PORTAL</div></div>
    <div style="padding:8px 24px 24px;font-size:15px;line-height:1.5">
      <h1 style="font-size:20px;margin:12px 0 10px">${esc(title)}</h1>
      ${bodyHtml}
      ${cta ? `<p style="margin:22px 0 8px"><a href="${cta.href}" style="background:#FFE30F;color:#000;border:1px solid #000;padding:10px 16px;text-decoration:none;font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:13px">${esc(cta.label)}</a></p>` : ""}
      <p style="color:#6b6b6b;font-size:12.5px;margin-top:24px">TCB Consult LLC / TCB Development Ltd. · CSLB Lic # 1093014 · tim@tcbreal.com · (310) 984-6621<br>This is an automatic confirmation from the client portal. Reply to reach Tim directly.</p>
    </div></div></body></html>`;
}

async function send(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) { console.warn("email skipped (RESEND_API_KEY / EMAIL_FROM not set):", subject); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, reply_to: BUILDER_EMAIL, subject, html }),
  });
  if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

export interface DecisionEmail {
  clientEmail: string | null | undefined; clientName: string; projectId: string; projectName: string; signedName: string; whenISO: string;
}

/** Selection approved: confirmation to the client, copy to Tim. */
export async function emailSelectionApproved(d: DecisionEmail & { item: string; option: string; priceLabel: string }) {
  const when = new Date(d.whenISO).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/Los_Angeles" });
  const rows = `<table style="border-collapse:collapse;font-size:15px"><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Project</td><td>${esc(d.projectName)}</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Selection</td><td>${esc(d.item)}</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Your choice</td><td><b>${esc(d.option)}</b> (${esc(d.priceLabel)})</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Signed</td><td>${esc(d.signedName)} · ${esc(when)}</td></tr></table>`;
  const link = { label: "View on the portal", href: `${SITE}/p/${d.projectId}/selections` };
  const jobs: Promise<boolean>[] = [];
  if (d.clientEmail) jobs.push(send([d.clientEmail], `Selection confirmed — ${d.item} (${d.projectName})`,
    layout("Your selection is confirmed", `<p>Thanks, ${esc(d.clientName.split(" ")[0] || "there")}. Here is a record of the selection you approved:</p>${rows}<p>TCB will order against this choice. If anything needs to change, message Tim through the portal as soon as possible — materials may already be on order.</p>`, link)));
  jobs.push(send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.item} → ${d.option}`,
    layout("Client approved a selection", `${rows}<p>Signed by ${esc(d.signedName)} (${esc(d.clientEmail ?? "no email")}).</p>`, link)));
  await Promise.all(jobs);
}

/** Change order approved or declined: confirmation to the client, copy to Tim. */
export async function emailChangeOrderDecided(d: DecisionEmail & { code: string; title: string; amountLabel: string; decision: "approved" | "declined" }) {
  const when = new Date(d.whenISO).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/Los_Angeles" });
  const verb = d.decision === "approved" ? "approved" : "declined";
  const rows = `<table style="border-collapse:collapse;font-size:15px"><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Project</td><td>${esc(d.projectName)}</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Change order</td><td><b>${esc(d.code)}</b> — ${esc(d.title)}</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Amount</td><td>${esc(d.amountLabel)}</td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Decision</td><td><b style="text-transform:uppercase">${verb}</b></td></tr><tr><td style="padding:4px 14px 4px 0;color:#6b6b6b">Signed</td><td>${esc(d.signedName)} · ${esc(when)}</td></tr></table>`;
  const link = { label: "View on the portal", href: `${SITE}/p/${d.projectId}/changes` };
  const jobs: Promise<boolean>[] = [];
  if (d.clientEmail) jobs.push(send([d.clientEmail], `Change order ${d.code} ${verb} (${d.projectName})`,
    layout(`Change order ${verb}`, `<p>Thanks, ${esc(d.clientName.split(" ")[0] || "there")}. This confirms your decision:</p>${rows}${d.decision === "approved" ? "<p>The amount is now part of your revised contract total, and TCB will proceed with the work.</p>" : "<p>TCB will not proceed with this scope. If you change your mind, message Tim through the portal.</p>"}`, link)));
  jobs.push(send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.code} ${verb} (${d.amountLabel})`,
    layout(`Client ${verb} ${d.code}`, `${rows}<p>Signed by ${esc(d.signedName)} (${esc(d.clientEmail ?? "no email")}).</p>`, link)));
  await Promise.all(jobs);
}

/** Client shared files: heads-up to Tim only. */
export async function emailClientUploaded(d: { clientEmail: string | null | undefined; clientName: string; projectId: string; projectName: string; titles: string[] }) {
  const list = `<ul>${d.titles.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  await send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.clientName} uploaded ${d.titles.length} file${d.titles.length === 1 ? "" : "s"}`,
    layout("New client upload", `<p>${esc(d.clientName)} (${esc(d.clientEmail ?? "no email")}) added to the Client uploads folder on ${esc(d.projectName)}:</p>${list}`, { label: "Open documents", href: `${SITE}/p/${d.projectId}/docs` }));
}
