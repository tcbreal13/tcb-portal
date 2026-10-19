/** Reads the plain-text stream from /api/claude and calls onText with the accumulated text. */
export async function streamClaude(body: unknown, onText: (t: string) => void): Promise<string> {
  const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    let msg = "Something went wrong. Please try again.";
    try { msg = (await res.json()).error ?? msg; } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  return text;
}
