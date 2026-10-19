import { notFound } from "next/navigation";
import { getJobRecord, getViewer } from "@/lib/data";
import { ftime } from "@/lib/format";
import { Compose } from "./Compose";

export const metadata = { title: "Messages" };

export default async function Messages({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, { user }] = await Promise.all([getJobRecord(id), getViewer()]);
  if (!r) notFound();
  return (
    <>
      <div><h1>Messages</h1><p className="sub">One thread per job, so decisions stay on the record.</p></div>
      <div className="panel">
        <div className="thread">
          {r.messages.length === 0 && <p className="note" style={{ margin: 0 }}>No messages yet. Start the thread below.</p>}
          {r.messages.map((m) => (
            <div className={`msg${m.sender_id === user.id ? " me" : ""}`} key={m.id}>
              <span className="meta">{m.sender_name || "Portal user"} · {ftime(m.created_at)}</span>{m.body}
            </div>
          ))}
        </div>
        <Compose projectId={id} />
      </div>
    </>
  );
}
