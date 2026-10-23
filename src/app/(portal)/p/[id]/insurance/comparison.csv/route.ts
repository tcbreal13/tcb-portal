import { NextResponse } from "next/server";
import { getJobRecord, insuranceTotals } from "@/lib/data";
import { buildInsuranceCsv, insuranceFileStem } from "@/lib/insurance-export";

export const dynamic = "force-dynamic";

/** GET /p/[id]/insurance/comparison.csv — the comparison as a plain spreadsheet (no logo possible in CSV; the Excel version carries it). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) return new NextResponse("Not found", { status: 404 });
  if (!r.access.includes("insurance") || !r.insurance) return new NextResponse("Not available", { status: 403 });
  const csv = buildInsuranceCsv({ project: r.project, claim: r.insurance, lines: r.insuranceLines, totals: insuranceTotals(r) });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${insuranceFileStem(r.project)}.csv"`, "Cache-Control": "private, no-store" } });
}
