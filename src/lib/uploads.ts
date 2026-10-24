/** Server side of direct uploads: read the file locations the browser already stored. */
export interface Uploaded { path: string; name: string; type: string; size: number }

/** Only paths under `mustStartWith` are accepted, so a form can't point a record at someone else's file. */
export function uploadedFiles(f: FormData, field: string, mustStartWith: string): Uploaded[] {
  return f.getAll(`${field}__uploaded`)
    .map((v) => { try { return JSON.parse(String(v)) as Uploaded; } catch { return null; } })
    .filter((u): u is Uploaded => !!u && typeof u.path === "string" && u.path.startsWith(mustStartWith) && !u.path.includes(".."));
}
export const uploadFailures = (f: FormData) => String(f.get("__upload_failures") ?? "").split(", ").filter(Boolean);
