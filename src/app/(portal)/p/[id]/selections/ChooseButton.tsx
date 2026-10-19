"use client";

import { useState, useTransition } from "react";
import { chooseSelection } from "../actions";

export function ChooseButton({ projectId, selectionId, optionId, name }: { projectId: string; selectionId: string; optionId: string; name: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <span className="btns">
        <span style={{ fontSize: 13 }}>Choose “{name}”?</span>
        <button className="btn sm" disabled={pending} onClick={() => start(async () => { await chooseSelection(projectId, selectionId, optionId); setConfirm(false); })}>{pending ? "Saving…" : "Yes"}</button>
        <button className="btn ghost sm" disabled={pending} onClick={() => setConfirm(false)}>No</button>
      </span>
    );
  }
  return <button className="btn ghost sm" onClick={() => setConfirm(true)}>Choose</button>;
}
