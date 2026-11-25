import Link from "next/link";

// CheckoutGuard's marks, in black and white. The badge is a seal: CHECKOUT arching over the top, GUARD underneath,
// stars either side, and a padlock with a check (secure checkout, verified). The seal is the compact version for
// small sizes (header, tab icon), where lettering would be too small to read.

export function Badge({ className = "h-32 w-32", fg = "#fff", bg = "#000" }: { className?: string; fg?: string; bg?: string }) {
  const star = "M0 0l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z";
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="CheckoutGuard">
      <defs>
        <path id="cg-top" d="M 40,100 A 60,60 0 0 1 160,100" />
        <path id="cg-bot" d="M 24,100 A 76,76 0 0 0 176,100" />
      </defs>
      <circle cx="100" cy="100" r="96" fill={fg} />
      <circle cx="100" cy="100" r="89" fill="none" stroke={bg} strokeWidth="1.6" strokeOpacity=".35" />
      <g fill={bg} fontFamily="Geist, Inter, Arial, sans-serif" fontWeight="800" fontSize="21" letterSpacing="3.2">
        <text><textPath href="#cg-top" startOffset="50%" textAnchor="middle">CHECKOUT</textPath></text>
        <text><textPath href="#cg-bot" startOffset="50%" textAnchor="middle">GUARD</textPath></text>
      </g>
      <path d={star} fill={bg} transform="translate(28 93)" /><path d={star} fill={bg} transform="translate(172 93)" />
      <g fill="none" stroke={bg} strokeWidth="3" strokeLinecap="round"><path d="M64 72 A 46 46 0 0 1 136 72" /><path d="M64 128 A 46 46 0 0 0 136 128" /></g>
      <path d="M84 92 v-9 a16 16 0 0 1 32 0 v9" fill="none" stroke={bg} strokeWidth="7" />
      <rect x="74" y="90" width="52" height="38" rx="7" fill={bg} />
      <path d="m88 109 8 8 16-17" fill="none" stroke={fg} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Seal({ className = "h-9 w-9", fg = "#fff", bg = "#000" }: { className?: string; fg?: string; bg?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill={fg} />
      <circle cx="32" cy="32" r="27" fill="none" stroke={bg} strokeWidth="1.4" strokeOpacity=".35" />
      <path d="M24.5 28.5v-4a7.5 7.5 0 0 1 15 0v4" fill="none" stroke={bg} strokeWidth="4" />
      <rect x="19" y="27" width="26" height="20" rx="4" fill={bg} />
      <path d="m25.5 37 4.2 4.2 8.3-8.7" fill="none" stroke={fg} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The header logo: the seal and the wordmark in white. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="CheckoutGuard home">
      <Seal className="h-9 w-9 drop-shadow-[0_0_14px_rgb(255_255_255/0.35)]" />
      <span className="text-[17px] font-bold tracking-tight text-white">Checkout<span className="font-medium text-white/70">Guard</span></span>
    </Link>
  );
}
