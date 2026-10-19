import Link from "next/link";
import { Brand } from "@/components/Brand";
import { getViewer } from "@/lib/data";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getViewer();
  return (
    <div className="wrap">
      <div className="top">
        <Brand />
        <div className="sp" />
        <div className="btns">
          {profile.role === "builder" && <Link href="/" className="btn ghost sm">All projects</Link>}
          <span className="who">{profile.full_name}{profile.role === "builder" ? " · Builder" : ""}</span>
          <form action="/auth/signout" method="post"><button className="linkbtn">Sign out</button></form>
        </div>
      </div>
      {children}
    </div>
  );
}
