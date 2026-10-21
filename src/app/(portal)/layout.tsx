import Link from "next/link";
import { Brand } from "@/components/Brand";
import { getViewer } from "@/lib/data";
import { TIERS } from "@/lib/access";
import { stopViewAs } from "./view-as-actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, viewAs } = await getViewer();
  return (
    <div className="wrap">
      {viewAs && (
        <div className="previewbar" role="status">
          <span><b>Previewing as {TIERS[viewAs].label}</b> — this is exactly what they see. Nothing you do here is saved or emailed.</span>
          <form action={stopViewAs}><button className="btn sm">Exit preview</button></form>
        </div>
      )}
      <div className="top">
        <Brand />
        <div className="sp" />
        <div className="btns">
          {profile.role === "builder" && <Link href="/" className="btn ghost sm">All projects</Link>}
          <span className="who">{profile.full_name}{viewAs ? ` · viewing as ${TIERS[viewAs].label}` : profile.role === "builder" ? " · Builder" : ""}</span>
          <form action="/auth/signout" method="post"><button className="linkbtn">Sign out</button></form>
        </div>
      </div>
      {children}
    </div>
  );
}
