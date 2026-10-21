/** Client-facing sections that can be switched on/off per client. Messages are always on. */
export const SECTIONS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "schedule", label: "Schedule", path: "/schedule" },
  { key: "logs", label: "Daily logs & photos", path: "/logs" },
  { key: "budget", label: "Budget & billing", path: "/budget" },
  { key: "changes", label: "Change orders", path: "/changes" },
  { key: "selections", label: "Selections", path: "/selections" },
  { key: "documents", label: "Documents", path: "/docs" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];
export const ALL_SECTIONS: SectionKey[] = SECTIONS.map((s) => s.key);

export function sectionsFromForm(f: FormData): SectionKey[] {
  const picked = new Set(f.getAll("access").map(String));
  return ALL_SECTIONS.filter((k) => picked.has(k));
}

/** First page a client may open on this job (messages if every section is off). */
export function firstAllowedPath(base: string, access: readonly string[]) {
  const s = SECTIONS.find((x) => access.includes(x.key));
  return s ? base + s.path : `${base}/messages`;
}

/** Member tiers and the sections each starts with. Individual switches can be changed afterwards. */
export const TIERS = {
  client: { label: "Client (owner)", sections: ALL_SECTIONS, canSign: true },
  architect: { label: "Architect / Designer", sections: ["logs", "selections", "documents"] as SectionKey[], canSign: false },
  consultant: { label: "Consultant", sections: ["logs", "selections", "documents"] as SectionKey[], canSign: false },
} as const;
export type Tier = keyof typeof TIERS;
export const isTier = (v: unknown): v is Tier => typeof v === "string" && v in TIERS;
/** Builders and clients sign selections and change orders; architects and consultants only view. */
export const canSign = (tier: string) => tier === "builder" || tier === "client";
