/** Standard document folders on every project, in display order. The category stored on each document is the folder name. */
export const DOC_FOLDERS = [
  { name: "Detailed rebuild budget", blurb: "The current line-item construction budget." },
  { name: "Executed contract – proposal", blurb: "Signed agreement, proposals and addenda." },
  { name: "Construction Plans", blurb: "Architectural, structural and MEP plan sets and revisions." },
  { name: "Survey", blurb: "Boundary and topographic surveys." },
  { name: "Soil Report", blurb: "Geotechnical / soils reports and addenda." },
  { name: "Structural observations", blurb: "Engineer's site observation reports and sign-offs." },
  { name: "Deputy inspections", blurb: "Deputy inspector reports: welding, concrete, masonry, epoxy." },
  { name: "Jobsite pictures and reports", blurb: "Progress photo sets and site reports." },
  { name: "Client uploads", blurb: "Anything you want to share with TCB: insurance paperwork, inspiration photos, plans from your designer." },
] as const;

export const CLIENT_FOLDER = "Client uploads";

export const OTHER_FOLDER = "Other";

/** Map legacy categories to the standard folders. */
export function normalizeFolder(category: string): string {
  const c = category.trim().toLowerCase();
  if (DOC_FOLDERS.some((f) => f.name.toLowerCase() === c)) return DOC_FOLDERS.find((f) => f.name.toLowerCase() === c)!.name;
  if (/client/.test(c)) return CLIENT_FOLDER;
  if (/budget/.test(c)) return "Detailed rebuild budget";
  if (/contract|proposal|change order|agreement/.test(c)) return "Executed contract – proposal";
  if (/structural|observation/.test(c)) return "Structural observations";
  if (/deputy|inspection/.test(c)) return "Deputy inspections";
  if (/photo|picture|report|log/.test(c)) return "Jobsite pictures and reports";
  return OTHER_FOLDER;
}

/* ---------- Custom folders and subfolders ---------- */
/** Folder paths join names with this: "Construction Plans / Architectural". */
export const SEP = " / ";
export const STANDARD_NAMES: string[] = DOC_FOLDERS.map((f) => f.name);

/** Clean a typed folder name: no slashes (they'd create a path), trimmed, sensible length. */
export function cleanFolderName(s: string) {
  return s.replace(/[\/\\]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Which folder a document belongs in, given this job's custom folders. Unknown categories fall back to the standard mapping. */
export function resolveFolder(category: string, custom: Iterable<string>): string {
  const c = category.trim();
  for (const p of custom) if (p.toLowerCase() === c.toLowerCase()) return p;
  return normalizeFolder(c);
}

export const isClientPath = (p: string) => p === CLIENT_FOLDER || p.startsWith(CLIENT_FOLDER + SEP);

export interface FolderNode { path: string; name: string; blurb: string; depth: number; standard: boolean; children: FolderNode[] }

/** Standard folders first (in their fixed order), then this job's own top-level folders A–Z; subfolders nest under their parent. */
export function folderTree(custom: string[], includeOther: boolean): FolderNode[] {
  const all = new Set<string>([...STANDARD_NAMES, ...custom]);
  // make sure every parent of a subfolder exists
  for (const p of custom) { const parts = p.split(SEP); for (let i = 1; i < parts.length; i++) all.add(parts.slice(0, i).join(SEP)); }
  if (includeOther) all.add(OTHER_FOLDER);
  const node = (path: string): FolderNode => {
    const name = path.split(SEP).at(-1)!;
    const kids = [...all].filter((x) => x.startsWith(path + SEP) && !x.slice(path.length + SEP.length).includes(SEP)).sort((a, b) => a.localeCompare(b));
    return { path, name, blurb: DOC_FOLDERS.find((f) => f.name === path)?.blurb ?? "", depth: path.split(SEP).length - 1, standard: STANDARD_NAMES.includes(path), children: kids.map(node) };
  };
  const tops = [...all].filter((p) => !p.includes(SEP));
  const ordered = [...STANDARD_NAMES.filter((n) => tops.includes(n)), ...tops.filter((t) => !STANDARD_NAMES.includes(t) && t !== OTHER_FOLDER).sort((a, b) => a.localeCompare(b)), ...(tops.includes(OTHER_FOLDER) ? [OTHER_FOLDER] : [])];
  return ordered.map(node);
}

/** Every folder path in tree order, for dropdowns. */
export function flattenTree(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}
