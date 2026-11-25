// CheckoutGuard's homepage: what it does, the loop, the proof from real Kane CLI runs, the guardrails, and how to run it.
import Link from "next/link";
import { ArrowRight, Bot, Check, FileSearch, FlaskConical, GitBranch, GitMerge, Github, Lock, RefreshCcw, ShieldCheck, Terminal, UserCheck } from "lucide-react";
import { LoopDemo } from "@/components/loop-demo";

const REPO = "https://github.com/BernardOnuh/checkoutguard";

const LOOP = [
  { icon: FlaskConical, title: "Kane CLI tests the journey", text: "Each checkout is a plain-English objective that ends in one assertion. Kane drives a real browser and decides pass or fail." },
  { icon: FileSearch, title: "A bug becomes evidence", text: "Kane's finding, its diagnosis, step screenshots and the network log become one brief. Kane's own hiccups are retried, never “fixed”." },
  { icon: Bot, title: "An agent patches it, sandboxed", text: "Claude Code (or OpenCode) works in an isolated git worktree with file tools only: no shell, no web, and nothing outside the store's source." },
  { icon: Check, title: "The unit gate", text: "No test that passed may fail, and at least one failing test must now pass. Two attempts at most." },
  { icon: RefreshCcw, title: "Kane reruns the same journey", text: "The patched store starts on its own port and Kane runs the identical objective. Only a Kane pass marks the repair verified." },
  { icon: UserCheck, title: "You approve the merge", text: "Review the diff and the before and after in the dashboard, then merge or discard. Nothing merges on its own." },
];

const PROOF = [
  { bug: "Cart subtotal ignores quantity", kane: "After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00.", fix: "subtotal() multiplies each price by its quantity", file: "kane-cart-total" },
  { bug: "An expired coupon still applies", kane: "The cart accepted OLD20 and applied a 20% discount instead of showing that the coupon had expired.", fix: "checkCoupon() checks the expiry date", file: "kane-expired-coupon" },
  { bug: "Confirmation says “Order not found”", kane: "After placing the order, checkout redirected to an Order not found page instead of showing the customer confirmation and order number.", fix: "the confirmation page reads ?order=", file: "kane-order-confirmation" },
];

const GUARDS = [
  { icon: Lock, title: "No shell, no web", text: "The agent can read and edit files. Commands and browsing are denied." },
  { icon: ShieldCheck, title: "Can't touch the tests", text: "A patch that changes anything outside store/src/ is rejected before it runs." },
  { icon: GitBranch, title: "Isolated worktrees", text: "Every attempt gets its own branch and folder. Your checkout is untouched." },
  { icon: GitMerge, title: "A person merges", text: "Verified isn't merged. Approval is explicit, with --no-ff, and nothing deploys." },
];

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_50%_at_70%_0%,rgb(139_92_246/0.22),transparent),radial-gradient(40%_40%_at_10%_10%,rgb(34_211_238/0.12),transparent)]" />

      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_24px_-4px_rgb(139_92_246/0.8)]"><ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.4} /></span>
            <span className="text-[17px] font-bold tracking-tight">Checkout<span className="grad-text">Guard</span></span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-mute md:flex">
            <a href="#loop" className="hover:text-ink">How it works</a>
            <a href="#proof" className="hover:text-ink">Proof</a>
            <a href="#guardrails" className="hover:text-ink">Guardrails</a>
            <a href="#install" className="hover:text-ink">Install</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={REPO} className="btn-ghost hidden !px-3 sm:inline-flex" aria-label="GitHub"><Github className="h-4 w-4" /></a>
            <Link href="/app" className="btn-primary">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* hero */}
        <section className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-violet-200">
              <FlaskConical className="h-3.5 w-3.5" />Kane CLI × your coding agent
            </div>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Every checkout tested.<br /><span className="grad-text">Every fix verified.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
              CheckoutGuard runs your checkout journeys with <b className="text-ink">Kane CLI</b>. When Kane catches a bug, a coding agent patches it from Kane's evidence, in a sandbox, and <b className="text-ink">Kane reruns the same journey</b>. A fix only counts when Kane says it passes, and only a person can merge it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="btn-primary !px-5 !py-3 text-[15px]">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
              <a href="#proof" className="btn-ghost !px-5 !py-3 text-[15px]">See the proof</a>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[["3 / 3", "bugs caught by Kane"], ["3 / 3", "fixes verified by Kane"], ["0", "merges without a person"]].map(([n, l]) => (
                <div key={l}><div className="font-mono text-2xl font-bold text-ink">{n}</div><div className="mt-1 text-xs leading-snug text-mute">{l}</div></div>
              ))}
            </div>
          </div>
          <LoopDemo />
        </section>

        {/* the loop */}
        <section id="loop" className="scroll-mt-24 py-16">
          <div className="eyebrow text-cyan-300">The closed loop</div>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Kane catches it. An agent fixes it. Kane proves it.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((s, k) => (
              <div key={s.title} className="card relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-400/20 ring-1 ring-white/10"><s.icon className="h-5 w-5 text-violet-200" /></span>
                  <span className="font-mono text-xs text-mute">0{k + 1}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* proof */}
        <section id="proof" className="scroll-mt-24 py-16">
          <div className="eyebrow text-emerald-300">Proven with real Kane CLI runs</div>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Three seeded checkout bugs. All caught, fixed and verified.</h2>
          <p className="mt-4 max-w-2xl text-mute">Each record has Kane's steps and diagnosis, the agent's patch, the unit checks, and Kane's passing rerun. The patches were then discarded so the bugs stay seeded for anyone who wants to try it.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PROOF.map(p => (
              <div key={p.file} className="card flex flex-col">
                <div className="text-[15px] font-semibold">{p.bug}</div>
                <div className="mt-4 rounded-xl bg-rose-500/[0.07] p-3 ring-1 ring-rose-400/25">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300"><FlaskConical className="h-3.5 w-3.5" />Kane CLI found</div>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink/90">“{p.kane}”</p>
                </div>
                <div className="mt-3 flex items-start gap-2 text-[13px] text-mute"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />Fix: <span className="font-mono text-[12px] text-ink/90">{p.fix}</span></div>
                <div className="mt-2 flex items-center gap-2 text-[13px] text-emerald-300"><Check className="h-4 w-4" />Kane rerun passed</div>
                <a href={`/evidence/${p.file}.html`} className="btn-ghost mt-5 !py-2 text-xs">Open the repair record<ArrowRight className="h-3.5 w-3.5" /></a>
              </div>
            ))}
          </div>
        </section>

        {/* guardrails */}
        <section id="guardrails" className="scroll-mt-24 py-16">
          <div className="eyebrow text-amber-300">Guardrails</div>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">An agent you can let loose on checkout code.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUARDS.map(g => (
              <div key={g.title} className="card">
                <g.icon className="h-5 w-5 text-amber-200" />
                <h3 className="mt-3 font-semibold">{g.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{g.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* install */}
        <section id="install" className="scroll-mt-24 py-16">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <div className="eyebrow text-violet-300">Run it tonight</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Five commands from clone to a verified fix.</h2>
              <p className="mt-4 text-mute">You need Node 22.5+, Chrome, a free testmuai.com account for Kane CLI, and Claude Code or OpenCode. The demo store's payments are fake: only the test card works and nothing is ever charged.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={REPO} className="btn-ghost"><Github className="h-4 w-4" />View on GitHub</a>
                <Link href="/app" className="btn-primary">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-black/50">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 font-mono text-[11px] text-mute"><Terminal className="h-3.5 w-3.5" />terminal</div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.75] text-ink/90">{`npm install -g @testmuai/kane-cli && kane-cli login
git clone ${REPO} && cd checkoutguard
cd dashboard && npm install && npm run dev     # http://127.0.0.1:3100
node runner/src/cli.js test all                # Kane runs every journey
node runner/src/cli.js repair <failureId>      # fix, rerun with Kane, verify`}</pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>CheckoutGuard · built for the KaneCLI Hackathon · testing by <a href="https://www.testmuai.com/support/docs/kane-cli-introduction/" className="underline decoration-white/20 underline-offset-2 hover:text-ink">Kane CLI</a></span>
          <span>The runner works on your machine only; the dashboard never exposes it publicly.</span>
        </div>
      </footer>
    </div>
  );
}
