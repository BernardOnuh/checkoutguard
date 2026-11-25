import Link from "next/link";

/** The CheckoutGuard mark: a bold C that curves round into a rerun arrow, with a check inside (tested, then
 *  re-verified). Drawn in currentColor so it works on any background. */
export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6.5} aria-hidden="true">
      <path d="M50.5 21A21 21 0 1 0 53 36" /><path d="m51.5 12.5-1 8.5-8.4-1.4" /><path d="m28 33 6 6 13.5-14" />
    </svg>
  );
}

/** The CheckoutGuard logo, black and white: the mark on a white tile, and the wordmark in white. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="CheckoutGuard home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black shadow-[0_0_0_1px_rgb(255_255_255/0.15),0_8px_20px_-8px_rgb(255_255_255/0.35)]">
        <LogoMark className="h-[22px] w-[22px]" />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-white">Checkout<span className="font-medium text-white/70">Guard</span></span>
    </Link>
  );
}
