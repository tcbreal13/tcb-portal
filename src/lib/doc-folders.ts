/** Standard document folders on every project, in display order. The category stored on each document is the folder name. */
export const DOC_FOLDERS = [
  { name: "Detailed rebuild budget", blurb: "The current line-item construction budget." },
  { name: "Executed contract – proposal", blurb: "Signed agreement, proposals and addenda." },
  { name: "Structural observations", blurb: "Engineer's site observation reports and sign-offs." },
  { name: "Deputy inspections", blurb: "Deputy inspector reports: welding, concrete, masonry, epoxy." },
  { name: "Jobsite pictures and reports", blurb: "Progress photo sets and site reports." },
] as const;

export const OTHER_FOLDER = "Other";

/** Map legacy categories to the standard folders. */
export function normalizeFolder(category: string): string {
  const c = category.trim().toLowerCase();
  if (DOC_FOLDERS.some((f) => f.name.toLowerCase() === c)) return DOC_FOLDERS.find((f) => f.name.toLowerCase() === c)!.name;
  if (/budget/.test(c)) return "Detailed rebuild budget";
  if (/contract|proposal|change order|agreement/.test(c)) return "Executed contract – proposal";
  if (/structural|observation/.test(c)) return "Structural observations";
  if (/deputy|inspection/.test(c)) return "Deputy inspections";
  if (/photo|picture|report|log/.test(c)) return "Jobsite pictures and reports";
  return OTHER_FOLDER;
}
