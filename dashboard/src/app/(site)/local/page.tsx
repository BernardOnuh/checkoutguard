// Where the public site sends dashboard links: the dashboard runs Kane CLI and Claude Code, so it only runs on your
// own machine. This page says so, and points to what can be seen here instead: the demo video, the three repair
// records from real Kane runs, and how to run it yourself.
import Link from "next/link";
import { ArrowLeft, FileCheck2, Github, Play, Terminal } from "lucide-react";
import { Badge, Logo } from "@/components/logo";
import { DEMO_URL } from "@/lib/public-site";

const REPO = "https://github.com/BernardOnuh/checkoutguard";
const RECORDS = [
  { file: "kane-cart-total", title: "Cart subtotal ignores quantity" },
  { file: "kane-expired-coupon", title: "An expired coupon still applies" },
  { file: "kane-order-confirmation", title: "Confirmation says “Order not found”" },
];

export const metadata = { title: "The dashboard runs locally · CheckoutGuard" };

export default function LocalOnly() {
  return (
    <div className="mono-site min-h-screen">
      <header className="px-3">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 backdrop-blur-xl sm:px-5">
          <Logo href="/" />
          <Link href="/" className="flex items-center gap-1.5 text-[13px] text-mute transition hover:text-white"><ArrowLeft className="h-4 w-4" />Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center sm:px-6">
        <Badge className="mx-auto h-24 w-24 drop-shadow-[0_0_40px_rgb(255_255_255/0.4)]" />
        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">The dashboard runs <span className="text-neutral-400">on your machine.</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mute">
          Its buttons run Kane CLI in a real browser and let a coding agent change code, using your own Kane credits and
          sign-ins. So it never runs on a public server. Here's how to see it instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {DEMO_URL && <a href={DEMO_URL} className="btn-light !rounded-full !px-6 !py-3"><Play className="h-4 w-4" fill="currentColor" />Watch the demo</a>}
          <a href={REPO} className="btn-ghost !rounded-full !px-6 !py-3"><Github className="h-4 w-4" />View on GitHub</a>
        </div>

        <section className="mt-16 text-left">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><FileCheck2 className="h-3.5 w-3.5" />Repair records from real Kane runs</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {RECORDS.map(r => (
              <a key={r.file} href={`/evidence/${r.file}.html`} className="card block !p-4 transition hover:-translate-y-0.5 hover:border-white/25">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-2 text-xs text-mute">Kane's finding, the fix, and Kane's verified rerun →</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12 text-left">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><Terminal className="h-3.5 w-3.5" />Run it yourself</h2>
          <pre className="tile mt-4 overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.9] text-neutral-200">{`$ npm install -g @testmuai/kane-cli && kane-cli login
$ git clone ${REPO}
$ cd checkoutguard/dashboard && npm install && npm run dev
# then open http://127.0.0.1:3100/app`}</pre>
        </section>
      </main>
    </div>
  );
}
