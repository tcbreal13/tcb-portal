import { NextResponse } from "next/server";
import { getJobRecord, getViewer } from "@/lib/data";
import { buildertrendCsv, clientCsv, groupByPhase, visibleTasks } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/**
 * GET /p/[id]/schedule/schedule.csv — the schedule as a spreadsheet.
 * Clients get a plain task list; the builder gets the Buildertrend "Schedule Import" layout (add ?format=client for the plain one).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { profile }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) return new NextResponse("Not found", { status: 404 });
  if (!r.access.includes("schedule")) return new NextResponse("Not available", { status: 403 });
  const forBuilder = profile.role === "builder";
  const plain = !forBuilder || new URL(req.url).searchParams.get("format") === "client";
  const groups = groupByPhase(r.phases, visibleTasks(r, forBuilder));
  const csv = plain ? clientCsv(r.project.name, groups) : buildertrendCsv(groups);
  const name = `${r.project.name.replace(/[^A-Za-z0-9]+/g, "-")}-schedule${plain ? "" : "-buildertrend"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
