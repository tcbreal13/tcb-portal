import { Brand } from "@/components/Brand";
import { confirmActivation } from "./actions";

export const metadata = { title: "Activate your account" };

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> }) {
  const sp = await searchParams;
  const isNew = sp.type === "invite" || sp.type === "recovery";
  if (!sp.token_hash || !sp.type) {
    return (
      <div className="wrap"><div className="top"><Brand /></div>
        <div className="login panel"><h1>Link incomplete</h1><p className="sub">Open the button in your activation email again, or reply to that email and Tim will send a new one.</p></div>
      </div>
    );
  }
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <form action={confirmActivation} className="login panel">
        <div>
          <h1>{isNew ? "Activate your account" : "Sign in to the portal"}</h1>
          <p className="sub">{isNew ? "Tim has set up your access. Continue to choose your password; you’ll go straight to your project afterwards." : "Continue to open your project."}</p>
        </div>
        <input type="hidden" name="token_hash" value={sp.token_hash} />
        <input type="hidden" name="type" value={sp.type} />
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <div className="btns"><button className="btn">{isNew ? "Activate my account" : "Continue"}</button></div>
      </form>
    </div>
  );
}
