import { NextResponse } from "next/server";
import { getJobRecord, getViewer } from "@/lib/data";
import { groupByPhase, visibleTasks } from "@/lib/schedule";
import { buildGanttPdf } from "@/lib/gantt-pdf";

export const dynamic = "force-dynamic";

/** GET /p/[id]/schedule/gantt.pdf — Gantt chart as a landscape PDF. Clients get only client-visible rows. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { profile }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) return new NextResponse("Not found", { status: 404 });
  const forBuilder = profile.role === "builder";
  const groups = groupByPhase(r.phases, visibleTasks(r, forBuilder));
  const bytes = await buildGanttPdf({
    projectName: r.project.name, address: r.project.address, clients: r.project.client_names, targetCompletion: r.project.target_completion,
    scheduleStatus: r.project.schedule_status, scheduleNote: r.project.schedule_note, groups, forBuilder,
  });
  const name = `${r.project.name.replace(/[^A-Za-z0-9]+/g, "-")}-schedule-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
