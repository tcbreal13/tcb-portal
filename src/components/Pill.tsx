export function Pill({ kind, children }: { kind: "good" | "warn" | "crit" | "info" | "idle"; children: React.ReactNode }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}
