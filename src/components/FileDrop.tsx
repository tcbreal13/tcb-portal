"use client";

import { useState } from "react";

/** A file input you can also drop files onto. Same field name/behaviour as a plain <input type="file">. */
export function FileDrop({ name, multiple = true, accept, required, label = "Drop files here, or tap to choose" }: { name: string; multiple?: boolean; accept?: string; required?: boolean; label?: string }) {
  const [over, setOver] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className={`filedrop${over ? " over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={() => setOver(false)}>
      <input type="file" name={name} multiple={multiple} accept={accept} required={required} aria-label={label}
        onChange={(e) => setNames([...(e.target.files ?? [])].map((f) => f.name))} />
      {names.length ? <span><strong>{names.length} file{names.length === 1 ? "" : "s"}:</strong> {names.slice(0, 4).join(", ")}{names.length > 4 ? ` +${names.length - 4} more` : ""}</span> : <span>{label}</span>}
    </div>
  );
}
