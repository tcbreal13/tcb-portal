export function usd(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  const s = Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (v < 0 ? "−$" : "$") + s;
}
export function signed(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v === 0) return "Included";
  return (v > 0 ? "+" : "") + usd(v);
}
export function fdate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!d) return "";
  const dt = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", opts);
}
export function fshort(d: string | null | undefined): string {
  return fdate(d, { month: "short", day: "numeric" });
}
export function fweekday(d: string | null | undefined): string {
  return fdate(d, { weekday: "short", month: "short", day: "numeric" });
}
export function ftime(d: string): string {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function todayISO(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function sum<T>(a: T[], f: (x: T) => number | string): number {
  return a.reduce((t, x) => t + Number(f(x) || 0), 0);
}
