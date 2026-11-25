import Link from "next/link";
import { Logo } from "@/components/logo";
import { runner } from "@/lib/runner";
import { TesterTag } from "@/components/ui";

// The dashboard's frame: header with the tester in use, the page, and the footer.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tester = runner.tester();
  return (
    <>
        <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Logo href="/app" />
            <div className="flex items-center gap-3 text-xs text-mute">
              <Link href="/" className="hidden font-semibold text-mute transition hover:text-ink sm:inline">Home</Link>
              <span className="hidden h-4 w-px bg-line sm:block" />
              <span className="hidden sm:inline">Tester</span><TesterTag runner={tester} />
              <span className="hidden h-4 w-px bg-line sm:block" />
              <span className="hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Runner on this machine</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-mute sm:px-6">Every checkout tested. Every fix verified. Payments in the demo store use a fake provider; nothing is ever charged.</footer>
    </>
  );
}
