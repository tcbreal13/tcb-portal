"use client";

import { useState, useTransition } from "react";
import { chooseSelection } from "../actions";
import { SignatureBox } from "@/components/SignatureBox";

export function ChooseButton({ projectId, selectionId, optionId, name, item, priceLabel, defaultName }: {
  projectId: string; selectionId: string; optionId: string; name: string; item: string; priceLabel: string; defaultName?: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>();
  if (open) {
    return (
      <div style={{ flexBasis: "100%" }}>
        <SignatureBox
          statement={`I approve "${name}" (${priceLabel}) for ${item}. I understand it may be ordered right away and that changing it later may cost time and money.`}
          confirmLabel="Sign and approve" defaultName={defaultName} pending={pending}
          onConfirm={(n) => start(async () => { const r = await chooseSelection(projectId, selectionId, optionId, n); if (r.error) setErr(r.error); else setOpen(false); })}
          onCancel={() => setOpen(false)} />
        {err && <p className="err">{err}</p>}
      </div>
    );
  }
  return <button className="btn ghost sm" onClick={() => setOpen(true)}>Choose</button>;
}
