"use client";

import Link from "next/link";
import { useRef } from "react";

interface DocLink { label: string; url: string }

/** One small "PDF documents" button per pay app; opens a pop-up listing its files to view or download. */
export function PayAppDocs({ number, links, manageHref }: { number: number; links: DocLink[]; manageHref?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  if (links.length === 0) {
    return manageHref
      ? <Link href={manageHref} className="btn ghost sm">Attach PDFs</Link>
      : <span className="note" style={{ margin: 0 }}>Not uploaded yet</span>;
  }
  const fileName = (label: string) => `Pay app ${number} - ${label}.pdf`;
  return (
    <>
      <button type="button" className="btn sm" onClick={() => ref.current?.showModal()}>PDF documents</button>
      <dialog ref={ref} className="docpop" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="docpop-in">
          <div className="row nt" style={{ borderTop: 0 }}>
            <div className="grow"><div className="eyebrow">Pay application #{number}</div><h2 style={{ margin: "2px 0 0" }}>PDF documents</h2></div>
            <button type="button" className="btn ghost sm" onClick={() => ref.current?.close()} aria-label="Close">Close</button>
          </div>
          <div className="rows">
            {links.map((l) => (
              <div className="row" key={l.label}>
                <div className="grow t">{l.label}</div>
                <div className="btns" style={{ gap: 6 }}>
                  <a className="btn ghost sm" href={l.url} target="_blank" rel="noopener">View</a>
                  <a className="btn sm" href={`${l.url}&download=${encodeURIComponent(fileName(l.label))}`}>Download</a>
                </div>
              </div>
            ))}
          </div>
          {manageHref && <div style={{ marginTop: 12 }}><Link href={manageHref} className="linkbtn">Edit PDFs</Link></div>}
        </div>
      </dialog>
    </>
  );
}
