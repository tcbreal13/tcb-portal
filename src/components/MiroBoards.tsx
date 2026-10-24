import { miroBoardUrl, miroEmbedUrl } from "@/lib/miro";

export interface Board { id: string; title: string; board_id: string }

/** Live Miro boards, view-and-zoom inside the portal, with a link out to Miro. */
export function MiroBoards({ boards }: { boards: Board[] }) {
  if (!boards.length) return null;
  return (
    <>
      {boards.map((b) => (
        <div className="panel miro" key={b.id}>
          <div className="row nt">
            <div className="grow"><h2 style={{ margin: 0 }}>{b.title}</h2></div>
            <a className="btn ghost sm" href={miroBoardUrl(b.board_id)} target="_blank" rel="noopener">Open in Miro</a>
          </div>
          <div className="miro-frame">
            <iframe src={miroEmbedUrl(b.board_id)} title={b.title} allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen loading="lazy" />
          </div>
          <p className="note" style={{ marginBottom: 0 }}>Drag to move around, pinch or scroll to zoom. If the board asks you to sign in, use “Open in Miro”.</p>
        </div>
      ))}
    </>
  );
}
