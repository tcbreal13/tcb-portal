import { AskClaude } from "./AskClaude";

export const metadata = { title: "Ask Claude" };

export default async function Ask({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const [{ id }, { q }] = await Promise.all([params, searchParams]);
  return (
    <>
      <div><h1>Ask Claude</h1><p className="sub">Answers come from this job&rsquo;s records only.</p></div>
      <AskClaude projectId={id} initialQuestion={q} />
    </>
  );
}
