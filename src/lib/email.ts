/**
 * Transactional email via Resend (https://resend.com).
 * Needs RESEND_API_KEY and EMAIL_FROM (e.g. "TCB Client Portal <noreply@tcbbuilder.com>") in Vercel.
 * Replies go to BUILDER_NOTIFY_EMAIL (Tim), never to the noreply address.
 * If the key is missing the portal keeps working and just logs that no email went out.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcbbuilder.com").replace(/\/$/, "");
const BUILDER_EMAIL = process.env.BUILDER_NOTIFY_EMAIL ?? "tim@tcbreal.com";
const FROM = process.env.EMAIL_FROM ?? "TCB Client Portal <noreply@tcbbuilder.com>";

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }

/* ---------- brand layout (tables + inline styles so it renders the same in Gmail, Outlook and Apple Mail) ---------- */
const INK = "#242424", MUTED = "#6B6B6B", LINE = "#D9D9D9", SUNK = "#F1F1F1", YELLOW = "#FFE30F", BLACK = "#111111";
const FONT = "'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif";

/** Label/value rows, styled like the portal's detail tables. */
export function rows(pairs: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border-top:1px solid ${LINE}">
    ${pairs.map(([k, v]) => `<tr>
      <td style="padding:10px 12px 10px 0;border-bottom:1px solid ${LINE};font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${MUTED};width:34%;vertical-align:top">${esc(k)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font:400 15px/1.45 ${FONT};color:${INK};vertical-align:top">${v}</td></tr>`).join("")}
  </table>`;
}

/** Yellow pill, like the portal's status chips. */
const chip = (text: string, bg = YELLOW, fg = "#000") => `<span style="display:inline-block;background:${bg};color:${fg};font:700 11px ${FONT};letter-spacing:.06em;text-transform:uppercase;padding:3px 8px">${esc(text)}</span>`;

export function layout(opts: { eyebrow?: string; title: string; preheader?: string; body: string; cta?: { label: string; href: string }; footnote?: string }) {
  const { eyebrow, title, preheader, body, cta, footnote } = opts;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${SUNK};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${SUNK}">${esc(preheader ?? title)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SUNK}"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    <!-- header: black band, logo, yellow rule (same as the portal top bar) -->
    <tr><td style="background:${BLACK};padding:22px 28px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/logo-light.png" width="132" height="54" alt="TCB Development Integration" style="display:block;border:0;width:132px;height:auto"></a></td>
        <td align="right" style="font:600 10.5px ${FONT};letter-spacing:.22em;text-transform:uppercase;color:#A6A6A6">Client portal</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${YELLOW};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
    <!-- card -->
    <tr><td style="background:#FFFFFF;padding:30px 28px 26px;border-left:1px solid ${LINE};border-right:1px solid ${LINE}">
      ${eyebrow ? `<div style="font:700 11px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${MUTED};margin:0 0 8px">${esc(eyebrow)}</div>` : ""}
      <h1 style="margin:0 0 14px;font:600 25px/1.2 ${FONT};color:${INK};letter-spacing:.01em">${esc(title)}</h1>
      <div style="font:400 15px/1.55 ${FONT};color:${INK}">${body}</div>
      ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="background:${YELLOW};border:1px solid #000">
        <a href="${cta.href}" style="display:inline-block;padding:12px 22px;font:700 13px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#000;text-decoration:none">${esc(cta.label)}</a></td></tr></table>
        <div style="font:400 12px/1.5 ${FONT};color:${MUTED};margin-top:10px">Or open <a href="${cta.href}" style="color:${MUTED}">${esc(cta.href.replace(/^https?:\/\//, ""))}</a></div>` : ""}
      ${footnote ? `<div style="margin-top:22px;padding-top:14px;border-top:1px solid ${LINE};font:400 13px/1.5 ${FONT};color:${MUTED}">${footnote}</div>` : ""}
    </td></tr>
    <!-- footer -->
    <tr><td style="background:#FFFFFF;border:1px solid ${LINE};border-top:0;padding:0 28px"><div style="height:1px;background:${LINE};line-height:1px;font-size:0">&nbsp;</div></td></tr>
    <tr><td style="padding:18px 28px 6px;font:400 12px/1.6 ${FONT};color:${MUTED}">
      <strong style="color:${INK};font-weight:600">TCB Consult LLC / TCB Development Ltd.</strong><br>
      CSLB Lic #1093014 &nbsp;·&nbsp; Pacific Palisades, CA &nbsp;·&nbsp; (310) 984-6621<br>
      Sent automatically from <a href="${SITE}" style="color:${MUTED}">${esc(SITE.replace(/^https?:\/\//, ""))}</a>. Questions? Just reply — it goes to Tim.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Plain-text twin of every email, for clients that prefer it and for spam scoring. */
function textVersion(title: string, lines: string[], href?: string) {
  return [title, "", ...lines, ...(href ? ["", href] : []), "", "—", "TCB Consult LLC / TCB Development Ltd. · CSLB Lic #1093014", "Reply to this email to reach Tim."].join("\n");
}

async function send(to: string[], subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("email skipped (RESEND_API_KEY not set):", subject); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: BUILDER_EMAIL, subject, html, text }),
  });
  if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/Los_Angeles" });
const first = (name: string) => esc(name.split(" ")[0] || "there");

export interface DecisionEmail {
  clientEmail: string | null | undefined; clientName: string; projectId: string; projectName: string; signedName: string; whenISO: string;
}

/** Selection approved: confirmation to the client, copy to Tim. */
export async function emailSelectionApproved(d: DecisionEmail & { item: string; option: string; priceLabel: string }) {
  const table = rows([["Project", esc(d.projectName)], ["Selection", esc(d.item)], ["Your choice", `<strong>${esc(d.option)}</strong>`], ["Price vs. allowance", esc(d.priceLabel)], ["Signed", `${esc(d.signedName)}<br><span style="color:${MUTED};font-size:13px">${esc(when(d.whenISO))}</span>`]]);
  const href = `${SITE}/p/${d.projectId}/selections`;
  const jobs: Promise<boolean>[] = [];
  if (d.clientEmail) jobs.push(send([d.clientEmail], `Selection confirmed — ${d.item} (${d.projectName})`,
    layout({ eyebrow: d.projectName, title: "Your selection is confirmed", preheader: `${d.item}: ${d.option}`,
      body: `<p style="margin:0 0 4px">Thanks, ${first(d.clientName)}. Here's the record of what you approved and signed:</p>${table}<p style="margin:0">TCB will order against this choice. If anything needs to change, message Tim on the portal as soon as you can — materials may already be on order.</p>`,
      cta: { label: "View on the portal", href } }),
    textVersion("Your selection is confirmed", [`Project: ${d.projectName}`, `Selection: ${d.item}`, `Your choice: ${d.option} (${d.priceLabel})`, `Signed: ${d.signedName}, ${when(d.whenISO)}`], href)));
  jobs.push(send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.item} → ${d.option}`,
    layout({ eyebrow: "Builder notice", title: "Client approved a selection", body: `${table}<p style="margin:0">Signed by ${esc(d.signedName)} (${esc(d.clientEmail ?? "no email")}).</p>`, cta: { label: "Open selections", href } }),
    textVersion("Client approved a selection", [`${d.projectName}: ${d.item} → ${d.option} (${d.priceLabel})`, `Signed by ${d.signedName}`], href)));
  await Promise.all(jobs);
}

/** Change order approved or declined: confirmation to the client, copy to Tim. */
export async function emailChangeOrderDecided(d: DecisionEmail & { code: string; title: string; amountLabel: string; decision: "approved" | "declined" }) {
  const approved = d.decision === "approved";
  const table = rows([["Project", esc(d.projectName)], ["Change order", `<strong>${esc(d.code)}</strong> — ${esc(d.title)}`], ["Amount", esc(d.amountLabel)], ["Decision", approved ? chip("Approved") : chip("Declined", "#F6DDDA", "#A8322A")], ["Signed", `${esc(d.signedName)}<br><span style="color:${MUTED};font-size:13px">${esc(when(d.whenISO))}</span>`]]);
  const href = `${SITE}/p/${d.projectId}/changes`;
  const jobs: Promise<boolean>[] = [];
  if (d.clientEmail) jobs.push(send([d.clientEmail], `Change order ${d.code} ${d.decision} (${d.projectName})`,
    layout({ eyebrow: d.projectName, title: `Change order ${d.decision}`, preheader: `${d.code} — ${d.title} · ${d.amountLabel}`,
      body: `<p style="margin:0 0 4px">Thanks, ${first(d.clientName)}. This confirms your decision:</p>${table}<p style="margin:0">${approved ? "The amount is now part of your revised contract total, and TCB will proceed with the work." : "TCB will not proceed with this scope. If you change your mind, message Tim on the portal."}</p>`,
      cta: { label: "View change orders", href } }),
    textVersion(`Change order ${d.decision}`, [`Project: ${d.projectName}`, `${d.code} — ${d.title}`, `Amount: ${d.amountLabel}`, `Signed: ${d.signedName}, ${when(d.whenISO)}`], href)));
  jobs.push(send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.code} ${d.decision} (${d.amountLabel})`,
    layout({ eyebrow: "Builder notice", title: `Client ${d.decision} ${d.code}`, body: `${table}<p style="margin:0">Signed by ${esc(d.signedName)} (${esc(d.clientEmail ?? "no email")}).</p>`, cta: { label: "Open change orders", href } }),
    textVersion(`Client ${d.decision} ${d.code}`, [`${d.projectName}: ${d.title} (${d.amountLabel})`, `Signed by ${d.signedName}`], href)));
  await Promise.all(jobs);
}

/** Client shared files: heads-up to Tim only. */
export async function emailClientUploaded(d: { clientEmail: string | null | undefined; clientName: string; projectId: string; projectName: string; titles: string[] }) {
  const list = `<ul style="margin:12px 0 0;padding-left:20px">${d.titles.map((t) => `<li style="margin:4px 0">${esc(t)}</li>`).join("")}</ul>`;
  const href = `${SITE}/p/${d.projectId}/docs`;
  await send([BUILDER_EMAIL], `[Portal] ${d.projectName}: ${d.clientName} uploaded ${d.titles.length} file${d.titles.length === 1 ? "" : "s"}`,
    layout({ eyebrow: "Builder notice", title: "New client upload", body: `<p style="margin:0">${esc(d.clientName)} (${esc(d.clientEmail ?? "no email")}) added to the <strong>Client uploads</strong> folder on ${esc(d.projectName)}:</p>${list}`, cta: { label: "Open documents", href } }),
    textVersion("New client upload", [`${d.clientName} added to ${d.projectName}:`, ...d.titles.map((t) => `- ${t}`)], href));
}

/** Someone used "Request access" on the login page: heads-up to Tim. */
export async function emailAccessRequested(d: { fullName: string; email: string; projectHint: string; message: string }) {
  const href = `${SITE}/`;
  await send([BUILDER_EMAIL], `[Portal] Access request from ${d.fullName}`,
    layout({ eyebrow: "Builder notice", title: "New access request", preheader: `${d.fullName} · ${d.projectHint || "no project given"}`,
      body: rows([["Name", esc(d.fullName)], ["Email", `<a href="mailto:${esc(d.email)}" style="color:${INK}">${esc(d.email)}</a>`], ["Project", esc(d.projectHint || "—")], ["Message", esc(d.message || "—").replace(/\n/g, "<br>")]]) + `<p style="margin:0">Approve it from the access-request list on your portal home page — that sends the invite.</p>`,
      cta: { label: "Review request", href } }),
    textVersion("New access request", [`${d.fullName} <${d.email}>`, `Project: ${d.projectHint || "—"}`, d.message], href));
}
