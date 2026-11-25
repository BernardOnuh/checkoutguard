import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/** The CheckoutGuard logo, black and white: a white tile with a black shield-check, and the wordmark in white. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-[0_0_0_1px_rgb(255_255_255/0.15),0_8px_20px_-8px_rgb(255_255_255/0.35)]">
        <ShieldCheck className="h-5 w-5 text-black" strokeWidth={2.4} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-white">Checkout<span className="font-medium text-white/70">Guard</span></span>
    </Link>
  );
}
