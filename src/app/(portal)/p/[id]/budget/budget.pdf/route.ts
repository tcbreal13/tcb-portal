import { NextResponse } from "next/server";
import { getJobRecord, approvedTotal, billedTotal, revisedContract } from "@/lib/data";
import { buildBudgetPdf, budgetFileStem } from "@/lib/budget-export";
import { sum } from "@/lib/format";

export const dynamic = "force-dynamic";

/** GET /p/[id]/budget/budget.pdf — Budget & billing on TCB letterhead. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) return new NextResponse("Not found", { status: 404 });
  if (!r.access.includes("budget")) return new NextResponse("Not available", { status: 403 });
  const totals = { original: Number(r.project.contract_amount), approvedCos: approvedTotal(r), revised: revisedContract(r), billed: billedTotal(r), budgetTotal: sum(r.budget, (b) => b.budget) };
  const bytes = await buildBudgetPdf({ project: r.project, budget: r.budget, payApps: r.payApps, changeOrders: r.changeOrders, totals });
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${budgetFileStem(r.project)}.pdf"`, "Cache-Control": "private, no-store" } });
}
