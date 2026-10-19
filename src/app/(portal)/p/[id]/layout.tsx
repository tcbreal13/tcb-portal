import { notFound } from "next/navigation";
import { SideNav, type NavItem } from "@/components/SideNav";
import { getJobRecord, getViewer, openSelections, pendingCos } from "@/lib/data";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ profile }, record] = await Promise.all([getViewer(), getJobRecord(id)]);
  if (!record) notFound();
  const base = `/p/${id}`;

  const client: NavItem[] = [
    { href: base, label: "Overview" },
    { href: `${base}/schedule`, label: "Schedule" },
    { href: `${base}/logs`, label: "Daily logs & photos" },
    { href: `${base}/budget`, label: "Budget & billing" },
    { href: `${base}/changes`, label: "Change orders", count: pendingCos(record).length },
    { href: `${base}/selections`, label: "Selections", count: openSelections(record).length },
    { href: `${base}/docs`, label: "Documents" },
    { href: `${base}/messages`, label: "Messages" },
    { href: `${base}/ask`, label: "Ask Claude" },
  ];
  const builder: NavItem[] | undefined = profile.role === "builder" ? [
    { href: `${base}/manage`, label: "Needs attention" },
    { href: `${base}/manage/updates`, label: "Weekly update" },
    { href: `${base}/manage/logs`, label: "Post a daily log" },
    { href: `${base}/manage/budget`, label: "Budget & pay apps" },
    { href: `${base}/manage/changes`, label: "Change orders" },
    { href: `${base}/manage/selections`, label: "Selections" },
    { href: `${base}/manage/docs`, label: "Documents" },
    { href: `${base}/manage/people`, label: "Clients & access" },
    { href: `${base}/manage/settings`, label: "Job settings" },
  ] : undefined;

  return (
    <div className="shell">
      <SideNav base={base} client={client} builder={builder} />
      <main>{children}</main>
    </div>
  );
}
