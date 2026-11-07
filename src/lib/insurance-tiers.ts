import type { InsuranceClaim, InsuranceLine, InsuranceSection } from "@/lib/types";

/** Scope the carrier did not carry, in tiers that can each be discussed on their own. tier1–3 are trade work and
 *  carry the claim's overhead and fee; tier4 (soft costs) is owner-direct at cost. */
export const TIER_SECTIONS = ["tier1", "tier2", "tier3", "tier4"] as const;
export type TierSection = (typeof TIER_SECTIONS)[number];
export const isTier = (s: string): s is TierSection => (TIER_SECTIONS as readonly string[]).includes(s);

export const TIER_DEFAULT_LABELS: Record<TierSection, string> = {
  tier1: "Rebuild scope per the toxicology report — not carried",
  tier2: "Building code upgrades triggered by the permit",
  tier3: "Fire preventative measures (Very High Fire Hazard Severity Zone)",
  tier4: "Soft costs — design, engineering, permits and inspections (no markup)",
};
export const TIER_MARKED_UP: Record<TierSection, boolean> = { tier1: true, tier2: true, tier3: true, tier4: false };

export const ALL_SECTIONS: InsuranceSection[] = ["trade", "addon", "gap", ...TIER_SECTIONS];

export function tierLabel(c: InsuranceClaim | null, s: TierSection) {
  return (c?.tier_labels?.[s] ?? "").trim() || TIER_DEFAULT_LABELS[s];
}

export interface TierStep { key: string; label: string; add: number | null; running: number; emphasis?: boolean }

/** Running totals from the carrier figure to TCB's full-scope figure, one step per tier that has lines. */
export function tierSteps(c: InsuranceClaim | null, lines: InsuranceLine[], sameScope: { carrier: number; tcb: number }): { steps: TierStep[]; tiers: Record<TierSection, number>; markup: number; full: number } {
  const oh = Number(c?.tier_overhead ?? 0), fee = Number(c?.tier_fee ?? 0);
  const markup = (1 + oh) * (1 + fee);
  const tiers = Object.fromEntries(TIER_SECTIONS.map((s) => [s, lines.filter((l) => l.section === s).reduce((t, l) => t + Number(l.tcb_amount), 0)])) as Record<TierSection, number>;
  const steps: TierStep[] = [
    { key: "carrier", label: `${c?.carrier_label ?? "Carrier estimate"} — replacement cost`, add: null, running: sameScope.carrier },
    { key: "same", label: `${c?.tcb_label ?? "TCB market budget"} — same scope as the carrier`, add: sameScope.tcb - sameScope.carrier, running: sameScope.tcb, emphasis: true },
  ];
  let run = sameScope.tcb;
  for (const s of TIER_SECTIONS) {
    if (!tiers[s]) continue;
    const add = TIER_MARKED_UP[s] ? tiers[s] * markup : tiers[s];
    run += add;
    const pct = TIER_MARKED_UP[s] && markup > 1 ? ` (incl. ${Math.round(oh * 100)}% overhead and ${Math.round(fee * 100)}% fee)` : "";
    steps.push({ key: s, label: `Add: ${tierLabel(c, s)}${pct}`, add, running: run, emphasis: s === "tier1" });
  }
  return { steps, tiers, markup, full: run };
}
