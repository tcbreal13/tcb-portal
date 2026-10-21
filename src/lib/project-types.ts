/** The four job types a project can be tagged with (any combination). Order = display order. */
export const PROJECT_TYPES = ["Exterior / Interior Upgrade", "Remodel", "New Construction", "Pre-Development"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export function typesFromForm(f: FormData): ProjectType[] {
  const picked = new Set(f.getAll("project_types").map(String));
  return PROJECT_TYPES.filter((t) => picked.has(t));
}
