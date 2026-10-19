import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <div className="login panel">
        <h1>Not found</h1>
        <p className="sub">That page doesn&rsquo;t exist, or your account doesn&rsquo;t have access to it.</p>
        <div className="btns"><Link href="/" className="btn">Back to your projects</Link></div>
      </div>
    </div>
  );
}
