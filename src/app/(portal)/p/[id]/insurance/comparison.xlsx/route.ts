import { NextResponse } from "next/server";
import { getJobRecord, insuranceTotals } from "@/lib/data";
import { buildInsuranceXlsx, insuranceFileStem } from "@/lib/insurance-export";

export const dynamic = "force-dynamic";

/** GET /p/[id]/insurance/comparison.xlsx — the carrier-vs-TCB comparison as an Excel workbook on TCB letterhead. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) return new NextResponse("Not found", { status: 404 });
  if (!r.access.includes("insurance") || !r.insurance) return new NextResponse("Not available", { status: 403 });
  const body = await buildInsuranceXlsx({ project: r.project, claim: r.insurance, lines: r.insuranceLines, totals: insuranceTotals(r) });
  return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${insuranceFileStem(r.project)}.xlsx"`, "Cache-Control": "private, no-store" } });
}
