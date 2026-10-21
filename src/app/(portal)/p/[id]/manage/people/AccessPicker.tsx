"use client";

import { useState } from "react";
import { SECTIONS, TIERS, type Tier } from "@/lib/access";

/**
 * Role picker + section switches. Picking a role pre-ticks that role's default sections;
 * Tim can then tick or untick anything before saving. Messages are always on.
 */
export function AccessPicker({ tier: initialTier = "client", access: initialAccess }: { tier?: string; access?: string[] }) {
  const start = (initialTier in TIERS ? initialTier : "client") as Tier;
  const [tier, setTier] = useState<Tier>(start);
  const [on, setOn] = useState<string[]>(initialAccess ?? [...TIERS[start].sections]);
  const pickTier = (t: Tier) => { setTier(t); setOn([...TIERS[t].sections]); };
  const toggle = (k: string) => setOn((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  return (
    <>
      <fieldset className="typepick">
        <legend>Role</legend>
        <div className="typegrid">
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <label key={t} className="typeopt">
              <input type="radio" name="member_role" value={t} checked={tier === t} onChange={() => pickTier(t)} />
              <span className="box" aria-hidden="true" style={{ borderRadius: "50%" }} />
              <span>{TIERS[t].label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="typepick">
        <legend>Can see</legend>
        <div className="typegrid">
          {SECTIONS.map((s) => (
            <label key={s.key} className="typeopt">
              <input type="checkbox" name="access" value={s.key} checked={on.includes(s.key)} onChange={() => toggle(s.key)} />
              <span className="box" aria-hidden="true" />
              <span>{s.label}</span>
            </label>
          ))}
          <label className="typeopt" style={{ opacity: 0.7, cursor: "default" }}>
            <input type="checkbox" checked readOnly disabled />
            <span className="box" aria-hidden="true" />
            <span>Messages (always on)</span>
          </label>
        </div>
        <p className="note">{TIERS[tier].canSign ? "Can sign selections and approve change orders." : "View only — can’t sign selections or change orders."}</p>
      </fieldset>
    </>
  );
}
