import { NextResponse, type NextRequest } from "next/server";
import { getJobRecord, getViewer, recordForClaude } from "@/lib/data";
import { anthropic, MODEL, ASK_SYSTEM, UPDATE_SYSTEM, CO_SYSTEM } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body =
  | { kind: "ask"; projectId: string; messages: { role: "user" | "assistant"; content: string }[] }
  | { kind: "update"; projectId: string; notes?: string }
  | { kind: "co"; projectId: string; title: string; amount: string; notes: string };

/** Streams plain text from Claude. Everything runs server-side; the API key never reaches the browser. */
export async function POST(req: NextRequest) {
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const { profile } = await getViewer();
  const record = await getJobRecord(body.projectId);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const json = JSON.stringify(recordForClaude(record));

  let system: string;
  let messages: { role: "user" | "assistant"; content: string }[];

  if (body.kind === "ask") {
    const hist = (body.messages ?? []).slice(-12).filter((m) => typeof m.content === "string" && m.content.trim());
    if (!hist.length || hist[hist.length - 1].role !== "user") return NextResponse.json({ error: "No question" }, { status: 400 });
    system = `${ASK_SYSTEM}\n\nThe person asking is ${profile.role === "builder" ? "the builder, Tim" : "the homeowner"}.\n\nJOB RECORD (JSON):\n${json}`;
    messages = hist.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  } else if (body.kind === "update") {
    if (profile.role !== "builder") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    system = `${UPDATE_SYSTEM}\n\nJOB RECORD (JSON):\n${json}`;
    messages = [{ role: "user", content: `Draft this week's update.${body.notes ? ` Tim's extra notes for this week: ${body.notes.slice(0, 3000)}` : ""}` }];
  } else if (body.kind === "co") {
    if (profile.role !== "builder") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    system = `${CO_SYSTEM}\n\nJOB RECORD (JSON, for context on the project):\n${json}`;
    messages = [{ role: "user", content: `Title: ${body.title}\nPrice: $${body.amount}\nBuilder's notes: ${(body.notes ?? "").slice(0, 3000)}` }];
  } else {
    return NextResponse.json({ error: "Unknown request" }, { status: 400 });
  }

  const stream = anthropic().messages.stream({ model: MODEL, max_tokens: 1024, system, messages });
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
      } catch (e) {
        controller.enqueue(encoder.encode("\n\n[Claude is unavailable right now. Please try again in a moment or message Tim directly.]"));
        console.error(e);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
