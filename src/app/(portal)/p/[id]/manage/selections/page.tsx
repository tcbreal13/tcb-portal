import { notFound } from "next/navigation";
import { requireBuilder } from "@/lib/builder";
import { getJobRecord } from "@/lib/data";
import { signed, fshort } from "@/lib/format";
import { AdminForm, DeleteButton } from "@/components/AdminForm";
import { Pill } from "@/components/Pill";
import { saveSelection, deleteRow, reopenSelection, addBoard, removeBoard } from "../actions";
import { miroBoardUrl } from "@/lib/miro";
import { ReopenButton } from "./ReopenButton";

export const metadata = { title: "Selections" };

export default async function ManageSelections({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireBuilder();
  const { id } = await params;
  const r = await getJobRecord(id);
  if (!r) notFound();
  const { data: boards } = await supabase.from("project_boards").select("id, title, board_id").eq("project_id", id).eq("section", "selections").order("sort_order");
  const save = saveSelection.bind(null, id);

  return (
    <>
      <div><h1>Selections</h1><p className="sub">Post a decision with its options and the date you need it. Prices are relative to the allowance (0 = included).</p></div>
      <div className="panel">
        <h2 id="miro">Miro boards</h2>
        <p className="sub" style={{ marginTop: 0 }}>Shown live at the top of the client&rsquo;s Selections page. In Miro, set the board&rsquo;s sharing to &ldquo;Anyone with the link — can view&rdquo; so the client sees it without a Miro account.</p>
        <div className="rows" style={{ marginBottom: 10 }}>
          {(boards ?? []).map((b) => (
            <div className="row" key={b.id}>
              <div className="grow"><div className="t">{b.title}</div><div className="d"><a href={miroBoardUrl(b.board_id)} target="_blank" rel="noopener">Open in Miro</a></div></div>
              <DeleteButton onDelete={removeBoard.bind(null, id, b.id)} label="Remove" />
            </div>
          ))}
        </div>
        <AdminForm action={addBoard.bind(null, id)} submit="+ Add Miro link" reset>
          <div className="grid2">
            <div><label style={{ marginTop: 0 }}>Board link</label><input name="link" type="url" placeholder="https://miro.com/app/board/uXjV…=/" required /></div>
            <div><label style={{ marginTop: 0 }}>Title</label><input name="title" type="text" placeholder="Kitchen & bath finishes" /></div>
          </div>
        </AdminForm>
      </div>
      <div className="panel">
        <h2>New selection</h2>
        <AdminForm action={save} submit="Post to client" reset>
          <div className="grid2">
            <div><label style={{ marginTop: 0 }}>Item</label><input name="item" type="text" placeholder="Kitchen countertop slab" required /></div>
            <div><label style={{ marginTop: 0 }}>Needed by</label><input name="needed_by" type="date" /></div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div className="grid2" key={i}>
              <div><label>Option {i + 1}{i === 0 ? "" : " (optional)"}</label><input name="opt_name" type="text" placeholder={i === 0 ? "Taj Mahal quartzite" : ""} required={i === 0} /></div>
              <div><label>Price vs. allowance</label><input name="opt_price" type="text" inputMode="decimal" placeholder="0" /></div>
            </div>
          ))}
        </AdminForm>
      </div>
      <div className="panel">
        <h2>Posted selections</h2>
        {r.selections.length === 0 && <p className="note" style={{ margin: 0 }}>None yet.</p>}
        <div className="rows">
          {r.selections.map((s) => {
            const chosen = s.options.find((o) => o.id === s.chosen_option_id);
            return (
              <div className="row" key={s.id}>
                <div className="grow">
                  <div className="t">{s.item} {chosen ? <Pill kind="good">Chose {chosen.name}{s.signed_name ? ` — signed ${s.signed_name}` : ""}</Pill> : <Pill kind="warn">{s.needed_by ? `Needed by ${fshort(s.needed_by)}` : "Open"}</Pill>}</div>
                  <div className="d">{s.options.map((o) => `${o.name} (${signed(o.price_delta)})`).join(" · ")}</div>
                </div>
                {chosen && <ReopenButton onReopen={reopenSelection.bind(null, id, s.id)} />}
                <DeleteButton onDelete={deleteRow.bind(null, id, "selections", s.id)} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
