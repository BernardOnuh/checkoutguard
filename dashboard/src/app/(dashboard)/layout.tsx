import Link from "next/link";
import { Github, UserCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { runner } from "@/lib/runner";
import { TesterTag } from "@/components/ui";
import { SilkCanyon } from "@/components/landing/visuals";

const REPO = "https://github.com/BernardOnuh/checkoutguard";

// The dashboard's frame, in the homepage's black and white: a faint canyon of light lines at the top, the same
// floating header (with the tester in use), the page, and the footer.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tester = runner.tester();
  return (
    <div className="mono-site relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"><SilkCanyon /></div>

      <header className="sticky top-0 z-30 px-3">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/60 px-4 backdrop-blur-xl sm:px-5">
          <Logo href="/app" />
          <div className="flex items-center gap-3 text-xs text-mute">
            <Link href="/" className="hidden transition hover:text-white sm:inline">Home</Link>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="hidden sm:inline">Tester</span><TesterTag runner={tester} />
            <span className="hidden h-4 w-px bg-line md:block" />
            <span className="hidden items-center gap-1.5 md:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Runner on this machine</span>
            <a href={REPO} className="btn-ghost hidden !rounded-full !px-3 !py-2 sm:inline-flex" aria-label="GitHub"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">{children}</main>

      <footer className="relative border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5" />Every checkout tested. Every fix verified.</span>
          <span>Payments in the demo store use a fake provider; nothing is ever charged.</span>
        </div>
      </footer>
    </div>
  );
}
