import Link from "next/link";

/** Wordmark. Drop a logo file at public/logo.svg (or .png) and set NEXT_PUBLIC_LOGO=/logo.svg to use it instead. */
export function Brand({ sub = "Development Ltd. · Client portal" }: { sub?: string }) {
  const logo = process.env.NEXT_PUBLIC_LOGO;
  return (
    <Link href="/" className="brand" aria-label="TCB Development home">
      {logo ? <img src={logo} alt="TCB Development" /> : "TCB"}
      <small>{sub}</small>
    </Link>
  );
}
