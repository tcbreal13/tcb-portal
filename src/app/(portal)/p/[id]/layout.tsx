import { notFound } from "next/navigation";
import { canSign } from "@/lib/access";
import { SideNav, type NavItem } from "@/components/SideNav";
import { getJobRecord, getViewer, openSelections, pendingCos } from "@/lib/data";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ profile }, record] = await Promise.all([getViewer(), getJobRecord(id)]);
  if (!record) notFound();
  const base = `/p/${id}`;

  // Only the sections this viewer may see (builders see all). Messages are always on. "Ask Claude" is off for now.
  const can = (k: string) => record.access.includes(k);
  const client: NavItem[] = [
    can("overview") && { href: base, label: "Overview" },
    can("schedule") && { href: `${base}/schedule`, label: "Schedule" },
    can("logs") && { href: `${base}/logs`, label: "Daily logs & photos" },
    can("budget") && { href: `${base}/budget`, label: "Budget & billing" },
    can("changes") && { href: `${base}/changes`, label: "Change orders", count: pendingCos(record).length },
    can("selections") && { href: `${base}/selections`, label: "Selections", count: !canSign(record.tier) ? 0 : openSelections(record).length },
    can("documents") && { href: `${base}/docs`, label: "Documents" },
    { href: `${base}/messages`, label: "Messages" },
  ].filter(Boolean) as NavItem[];
  const builder: NavItem[] | undefined = profile.role === "builder" ? [
    { href: `${base}/manage`, label: "Needs attention" },
    { href: `${base}/manage/updates`, label: "Weekly update" },
    { href: `${base}/manage/logs`, label: "Post a daily log" },
    { href: `${base}/manage/schedule`, label: "Schedule" },
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
