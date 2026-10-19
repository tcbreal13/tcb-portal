"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; count?: number }

export function SideNav({ base, client, builder }: { base: string; client: NavItem[]; builder?: NavItem[] }) {
  const path = usePathname();
  const isCurrent = (href: string) => (href === base ? path === base : path === href || path.startsWith(href + "/"));
  const render = (n: NavItem) => (
    <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined}>
      {n.label}{n.count ? <span className="count">{n.count}</span> : null}
    </Link>
  );
  return (
    <nav className="side" aria-label="Sections">
      {builder && builder.length > 0 && (<><div className="grp">Builder tools</div>{builder.map(render)}<div className="grp">What the client sees</div></>)}
      {!builder && <div className="grp">Your project</div>}
      {client.map(render)}
    </nav>
  );
}
