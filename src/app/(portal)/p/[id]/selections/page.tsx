import { notFound } from "next/navigation";
import { getJobRecord } from "@/lib/data";
import { signed, fshort } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { ChooseButton } from "./ChooseButton";

export const metadata = { title: "Selections" };

export default async function Selections({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const open = r.selections.filter((s) => !s.chosen_option_id), done = r.selections.filter((s) => s.chosen_option_id);
  const list = [...open, ...done];
  return (
    <>
      <div><h1>Selections</h1><p className="sub">Finish choices and the date each one is needed to keep ordering on schedule. Prices are relative to your allowance.</p></div>
      {list.length === 0 && <div className="panel"><p className="note" style={{ margin: 0 }}>No selections are open right now.</p></div>}
      {list.map((s) => (
        <div className="panel" key={s.id}>
          <div className="row nt">
            <div className="grow"><h2 style={{ margin: 0 }}>{s.item}</h2></div>
            {s.chosen_option_id ? <Pill kind="good">Selected</Pill> : <Pill kind="warn">{s.needed_by ? `Needed by ${fshort(s.needed_by)}` : "Decision needed"}</Pill>}
          </div>
          {s.options.map((o) => {
            const sel = s.chosen_option_id === o.id;
            return (
              <div className={`opt${sel ? " sel" : ""}`} key={o.id}>
                <div className="grow"><b>{o.name}</b></div>
                <span className="num">{signed(o.price_delta)}</span>
                {sel ? <Pill kind="good">Your choice</Pill> : !s.chosen_option_id ? <ChooseButton projectId={id} selectionId={s.id} optionId={o.id} name={o.name} /> : null}
              </div>
            );
          })}
          {s.chosen_option_id && <p className="note">To change this selection, send Tim a message — it may already be ordered.</p>}
        </div>
      ))}
    </>
  );
}
