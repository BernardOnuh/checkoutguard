// CheckoutGuard's homepage, staged like a film: a full-screen hero with the repair replayed live under Kane's scan
// beam, the loop as an orbit, proof cards that play out real Kane CLI results, the agent's sandbox, install, and a
// closing call to action. Every scene plays by itself once it's on screen.
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ArrowRight, GitBranch, GitMerge, Github, Lock, ShieldCheck, Terminal } from "lucide-react";
import { CountUp, Reveal, WordsIn } from "@/components/landing/motion";
import { HeroStage, LoopOrbit, ProofCard, Sandbox } from "@/components/landing/scenes";

const REPO = "https://github.com/BernardOnuh/checkoutguard";

const PROOF = [
  { bug: "Cart subtotal ignores quantity", kane: "After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00.", fix: "subtotal() multiplies by quantity", file: "kane-cart-total" },
  { bug: "An expired coupon still applies", kane: "The cart accepted OLD20 and applied a 20% discount instead of showing that the coupon had expired.", fix: "checkCoupon() checks the expiry date", file: "kane-expired-coupon" },
  { bug: "Confirmation says “Order not found”", kane: "After placing the order, checkout redirected to an Order not found page instead of showing the customer confirmation and order number.", fix: "the confirmation page reads ?order=", file: "kane-order-confirmation" },
];

const GUARDS = [
  { icon: Lock, title: "No shell, no web", text: "The agent reads and edits files. Commands and browsing are denied." },
  { icon: ShieldCheck, title: "Hands off the tests", text: "A patch that changes anything outside store/src/ is rejected before it runs." },
  { icon: GitBranch, title: "Its own worktree", text: "Every attempt gets a separate branch and folder. Your checkout is untouched." },
  { icon: GitMerge, title: "A person merges", text: "Verified isn't merged. Approval is explicit, and nothing deploys." },
];

const BAND = ["Kane CLI catches it", "The agent fixes it", "Kane proves it", "A person merges it"];

export default function Home() {
  return (
    <div className="mono-site relative overflow-x-clip">
      {/* header */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/5 bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/" />
          <nav className="hidden items-center gap-7 text-sm text-mute md:flex">
            <a href="#loop" className="transition hover:text-ink">The loop</a>
            <a href="#proof" className="transition hover:text-ink">Proof</a>
            <a href="#guardrails" className="transition hover:text-ink">Guardrails</a>
            <a href="#install" className="transition hover:text-ink">Install</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={REPO} className="btn-ghost hidden !px-3 sm:inline-flex" aria-label="GitHub"><Github className="h-4 w-4" /></a>
            <Link href="/app" className="btn-light">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative flex min-h-[100svh] items-center pt-16">
        <div className="hero-glow pointer-events-none absolute -right-40 -top-40 h-[760px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.35),transparent)]" />
        <div className="hero-glow pointer-events-none absolute -left-40 top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.18),transparent)]" style={{ animationDelay: "2s" }} />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-white word-in" style={{ transform: "none", animation: "fade-swap .8s ease both" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Kane CLI × your coding agent
            </div>
            <h1 className="mt-7 text-[46px] font-extrabold leading-[1.0] tracking-[-0.03em] sm:text-[68px]">
              <WordsIn text="Every checkout tested." />
              <br />
              <WordsIn text="Every fix verified." start={380} wordClassName="bg-gradient-to-r from-white via-neutral-300 to-neutral-500 bg-clip-text text-transparent" />
            </h1>
            <Reveal delay={600}>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-mute">
                <b className="text-ink">Kane CLI</b> clicks through your checkout like a customer. When it catches a bug, a coding agent fixes it from Kane's evidence, in a sandbox, and <b className="text-ink">Kane reruns the same journey</b>. A fix only counts when Kane says it passes.
              </p>
            </Reveal>
            <Reveal delay={800}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/app" className="btn-light !px-6 !py-3.5 text-[15px]">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
                <a href="#proof" className="btn-ghost !px-6 !py-3.5 text-[15px]">Watch the proof</a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={300}><HeroStage /></Reveal>
        </div>
        <a href="#loop" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-mute transition hover:text-ink"><span className="block h-9 w-5 rounded-full border border-white/20"><span className="mx-auto mt-1.5 block h-2 w-1 animate-bounce rounded-full bg-white/60" /></span></a>
      </section>

      {/* ---------- marquee band ---------- */}
      <div className="relative border-y border-white/5 bg-white/[0.015] py-6">
        <div className="marquee flex w-max gap-12 whitespace-nowrap">
          {[...BAND, ...BAND, ...BAND, ...BAND].map((t, i) => (
            <span key={i} className="flex items-center gap-12 text-3xl font-bold tracking-tight text-transparent sm:text-5xl [-webkit-text-stroke:1px_rgb(255_255_255/0.22)]">
              {t}<span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-white to-neutral-500" />
            </span>
          ))}
        </div>
      </div>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------- the loop ---------- */}
        <section id="loop" className="scroll-mt-20 py-28">
          <Reveal>
            <div className="eyebrow text-white">The closed loop</div>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Kane catches it. An agent fixes it. <span className="mono-text">Kane proves it.</span></h2>
          </Reveal>
          <Reveal delay={200} className="mt-14"><LoopOrbit /></Reveal>
        </section>

        {/* ---------- stats ---------- */}
        <Reveal>
          <section className="grid gap-px overflow-hidden rounded-3xl border border-white/5 bg-white/5 sm:grid-cols-3">
            {[{ n: 3, s: "/3", l: "seeded bugs caught by Kane CLI" }, { n: 3, s: "/3", l: "fixes verified by a Kane rerun" }, { n: 0, s: "", l: "merges without a person" }].map(x => (
              <div key={x.l} className="bg-bg px-8 py-10">
                <div className="font-mono text-6xl font-bold tracking-tight"><span className="mono-text"><CountUp to={x.n} suffix={x.s} /></span></div>
                <div className="mt-3 text-sm text-mute">{x.l}</div>
              </div>
            ))}
          </section>
        </Reveal>

        {/* ---------- proof ---------- */}
        <section id="proof" className="scroll-mt-20 py-28">
          <Reveal>
            <div className="eyebrow text-white">Proven with real Kane CLI runs</div>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Three checkout bugs. All caught, fixed and verified.</h2>
            <p className="mt-5 max-w-2xl text-mute">These are Kane's own words from the runs. Each record has Kane's steps and diagnosis, the agent's patch, the unit checks and Kane's passing rerun. The patches were discarded afterwards so the bugs stay seeded for you to try.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PROOF.map((p, k) => <Reveal key={p.file} delay={k * 120}><ProofCard {...p} order={k} /></Reveal>)}
          </div>
        </section>

        {/* ---------- guardrails ---------- */}
        <section id="guardrails" className="scroll-mt-20 py-20">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal><Sandbox /></Reveal>
            <div>
              <Reveal>
                <div className="eyebrow text-white">Guardrails</div>
                <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">An agent you can let loose on checkout code.</h2>
              </Reveal>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {GUARDS.map((g, k) => (
                  <Reveal key={g.title} delay={k * 100}>
                    <div className="card h-full">
                      <g.icon className="h-5 w-5 text-white" />
                      <h3 className="mt-3 font-semibold">{g.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-mute">{g.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- install ---------- */}
        <section id="install" className="scroll-mt-20 py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="eyebrow text-white">Run it tonight</div>
              <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Five commands from clone to a verified fix.</h2>
              <p className="mt-5 text-mute">Node 22.5+, Chrome, a free testmuai.com account for Kane CLI, and Claude Code or OpenCode. The demo store's payments are fake: only the test card works and nothing is ever charged.</p>
            </Reveal>
            <Reveal delay={150}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_30px_80px_-30px_rgb(255_255_255/0.5)]">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-mono text-[11px] text-mute">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/70" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" />
                  <Terminal className="ml-2 h-3.5 w-3.5" />checkoutguard
                </div>
                <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-[1.9] text-ink/90">{`$ npm install -g @testmuai/kane-cli && kane-cli login
$ git clone ${REPO}
$ cd checkoutguard/dashboard && npm install && npm run dev
$ node runner/src/cli.js test all          `}<span className="text-white"># Kane runs every journey</span>{`
$ node runner/src/cli.js repair <failure>  `}<span className="text-white"># fix → Kane rerun → verified</span></pre>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------- closing ---------- */}
      <section className="relative overflow-hidden border-t border-white/5 py-32 text-center">
        <div className="hero-glow pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.3),transparent)]" />
        <Reveal className="relative px-4">
          <h2 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-7xl">Ship checkouts <span className="shimmer bg-gradient-to-r from-white via-neutral-300 via-40% to-neutral-500 bg-clip-text text-transparent">that work.</span></h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-mute">Every journey tested by Kane CLI. Every fix proven by Kane before a person merges it.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="btn-light !px-7 !py-4 text-base">Open dashboard<ArrowRight className="h-4 w-4" /></Link>
            <a href={REPO} className="btn-ghost !px-7 !py-4 text-base"><Github className="h-4 w-4" />Star on GitHub</a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>CheckoutGuard · built for the KaneCLI Hackathon · testing by <a href="https://www.testmuai.com/support/docs/kane-cli-introduction/" className="underline decoration-white/20 underline-offset-2 hover:text-ink">Kane CLI</a></span>
          <span>The runner works on your machine only; it's never exposed publicly.</span>
        </div>
      </footer>
    </div>
  );
}
