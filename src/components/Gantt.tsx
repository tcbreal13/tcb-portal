import { DAY, axisTicks, isMilestone, scheduleRange, todayMs, toMs, type PhaseGroup } from "@/lib/schedule";
import { fshort } from "@/lib/format";

/**
 * Phase-grouped Gantt chart as one inline SVG. Server component — no JS shipped.
 * Colours come from CSS variables so it follows light/dark mode.
 */
export function Gantt({ groups, showHidden = false }: { groups: PhaseGroup[]; showHidden?: boolean }) {
  const { t0: s0, t1: e0 } = scheduleRange(groups);
  const t0 = s0 - 2 * DAY, t1 = e0 + 3 * DAY;
  const span = Math.max(t1 - t0, DAY);

  const LAB = 300, ROW = 22, PH = 26, HEAD = 40, PAD = 10;
  const rows: { kind: "phase" | "task"; g: PhaseGroup; t?: PhaseGroup["tasks"][number] }[] = [];
  for (const g of groups) { rows.push({ kind: "phase", g }); for (const t of g.tasks) rows.push({ kind: "task", g, t }); }
  const chartW = Math.max(640, Math.min(1400, Math.round((span / DAY) * 7)));
  const W = LAB + chartW + PAD, H = HEAD + rows.reduce((h, r) => h + (r.kind === "phase" ? PH : ROW), 0) + PAD;
  const x = (ms: number) => LAB + ((ms - t0) / span) * chartW;
  const { months, weeks } = axisTicks(t0, t1);
  const now = todayMs();
  const ell = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);

  let y = HEAD;
  const body = rows.map((r, i) => {
    const top = y; const h = r.kind === "phase" ? PH : ROW; y += h;
    if (r.kind === "phase") {
      const gs = x(toMs(r.g.start)), ge = x(toMs(r.g.end) + DAY);
      return (
        <g key={`p${i}`}>
          <rect x={0} y={top} width={W} height={h} fill="var(--sunk)" />
          <text x={8} y={top + 17} fontSize={12} fontWeight={700} fill="var(--ink)" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>{ell(r.g.phase?.name ?? "Other", 40)}</text>
          <text x={LAB - 8} y={top + 17} fontSize={11} textAnchor="end" fill="var(--muted)">{r.g.percent}%</text>
          <rect x={gs} y={top + 9} width={Math.max(ge - gs, 2)} height={8} fill="var(--ink)" opacity={0.85} />
          <rect x={gs} y={top + 9} width={Math.max((ge - gs) * (r.g.percent / 100), 0)} height={8} fill="var(--accent)" />
        </g>
      );
    }
    const t = r.t!; const ms = isMilestone(t);
    const bs = x(toMs(t.start_date)), be = x(toMs(t.end_date) + DAY);
    const hidden = !t.show_client;
    const fill = t.status === "complete" ? "var(--good)" : t.status === "in_progress" ? "var(--accent)" : toMs(t.end_date) < now ? "var(--crit)" : "var(--surface)";
    const stroke = t.status === "complete" ? "var(--good)" : "var(--ink)";
    const cy = top + h / 2;
    return (
      <g key={t.id} opacity={hidden ? 0.55 : 1}>
        <line x1={0} x2={W} y1={top + h} y2={top + h} stroke="var(--line)" strokeWidth={0.5} />
        <text x={18} y={cy + 4} fontSize={11.5} fill="var(--ink)">{ell(t.title, 44)}{hidden && showHidden ? "  (hidden)" : ""}</text>
        <title>{`${t.title}\n${fshort(t.start_date)} – ${fshort(t.end_date)} · ${t.duration_days} work day${t.duration_days === 1 ? "" : "s"}${t.assigned_to ? ` · ${t.assigned_to}` : ""}`}</title>
        {ms ? (
          <polygon points={`${bs},${cy - 6} ${bs + 6},${cy} ${bs},${cy + 6} ${bs - 6},${cy}`} fill={t.status === "complete" ? "var(--good)" : "var(--ink)"} />
        ) : (
          <>
            <rect x={bs} y={cy - 6} width={Math.max(be - bs, 3)} height={12} fill={fill} stroke={stroke} strokeWidth={1} />
            {t.status === "in_progress" && <rect x={bs} y={cy - 6} width={Math.max((be - bs) * 0.5, 2)} height={12} fill="var(--ink)" opacity={0.25} />}
          </>
        )}
        <text x={ms ? bs + 10 : be + 5} y={cy + 4} fontSize={10} fill="var(--muted)">{t.assigned_to ? ell(t.assigned_to, 26) : ""}</text>
      </g>
    );
  });

  return (
    <div className="scroll">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gantt chart of the construction schedule" style={{ display: "block", fontFamily: "var(--body)", minWidth: W }}>
        {/* month bands */}
        {months.map((m, i) => (
          <g key={m.label}>
            <rect x={x(m.start)} y={0} width={x(m.end) - x(m.start)} height={HEAD} fill={i % 2 ? "var(--sunk)" : "transparent"} />
            {x(m.end) - x(m.start) > 54 && <text x={x(m.start) + 6} y={14} fontSize={11.5} fontWeight={700} fill="var(--ink)">{m.label}</text>}
          </g>
        ))}
        {/* week ticks */}
        {weeks.map((w) => (
          <g key={w.at}>
            <line x1={x(w.at)} x2={x(w.at)} y1={HEAD - 14} y2={H} stroke="var(--line)" strokeWidth={0.6} strokeDasharray="2 3" />
            <text x={x(w.at) + 2} y={HEAD - 4} fontSize={9} fill="var(--muted)">{w.label}</text>
          </g>
        ))}
        {/* weekends */}
        {Array.from({ length: Math.ceil(span / DAY) + 1 }, (_, i) => t0 + i * DAY).filter((d) => [0, 6].includes(new Date(d).getDay())).map((d) => (
          <rect key={d} x={x(d)} y={HEAD} width={x(d + DAY) - x(d)} height={H - HEAD} fill="var(--ink)" opacity={0.035} />
        ))}
        <line x1={LAB} x2={LAB} y1={0} y2={H} stroke="var(--line)" />
        <line x1={0} x2={W} y1={HEAD} y2={HEAD} stroke="var(--ink)" />
        {body}
        {now >= t0 && now <= t1 && (
          <g>
            <line x1={x(now)} x2={x(now)} y1={HEAD - 14} y2={H} stroke="var(--crit)" strokeWidth={1.5} />
            <text x={x(now) + 3} y={HEAD - 17} fontSize={9.5} fontWeight={700} fill="var(--crit)">TODAY</text>
          </g>
        )}
      </svg>
    </div>
  );
}
