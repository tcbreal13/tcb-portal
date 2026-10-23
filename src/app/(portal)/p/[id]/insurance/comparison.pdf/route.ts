import { NextResponse } from "next/server";
import { getJobRecord, insuranceTotals } from "@/lib/data";
import { insuranceFileStem } from "@/lib/insurance-export";
import { buildInsurancePdf } from "@/lib/insurance-pdf";

export const dynamic = "force-dynamic";

/** GET /p/[id]/insurance/comparison.pdf — the comparison as a portrait PDF on TCB letterhead. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) return new NextResponse("Not found", { status: 404 });
  if (!r.access.includes("insurance") || !r.insurance) return new NextResponse("Not available", { status: 403 });
  const bytes = await buildInsurancePdf({ project: r.project, claim: r.insurance, lines: r.insuranceLines, totals: insuranceTotals(r) });
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${insuranceFileStem(r.project)}.pdf"`, "Cache-Control": "private, no-store" } });
}
