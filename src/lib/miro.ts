/** Miro board links → board id, and the live-embed URL that shows the board inside the portal. */
export function miroBoardId(link: string): string | null {
  const m = link.trim().match(/miro\.com\/app\/(?:board|live-embed)\/([A-Za-z0-9_=\-]{6,80})/);
  return m ? m[1] : null;
}
export const miroEmbedUrl = (id: string) => `https://miro.com/app/live-embed/${id}/?autoplay=true`;
export const miroBoardUrl = (id: string) => `https://miro.com/app/board/${id}/`;
