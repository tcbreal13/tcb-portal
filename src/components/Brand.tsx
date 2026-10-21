import Link from "next/link";

/** TCB logo: charcoal artwork on light backgrounds, light artwork on dark. */
export function Brand({ sub = "Client portal" }: { sub?: string }) {
  return (
    <Link href="/" className="brand" aria-label="TCB Development home">
      <picture>
        <source srcSet="/logo-light.png" media="(prefers-color-scheme: dark)" />
        <img src="/logo-dark.png" alt="TCB Development Integration" width={900} height={366} />
      </picture>
      {/* Letters spread edge-to-edge under the logo's "DEVELOPMENT INTEGRATION" line, so the two lines start and end together. */}
      <small aria-label={sub}>{[...sub.toUpperCase()].map((c, i) => <span key={i} aria-hidden="true">{c === " " ? "\u00A0" : c}</span>)}</small>
    </Link>
  );
}
