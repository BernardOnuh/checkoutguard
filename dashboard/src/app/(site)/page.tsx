// CheckoutGuard's homepage, in black and white: a centered hero on a canyon of light lines with the app tile glowing
// on the valley floor, a strip of the tools it works with, what it is, how it works in four illustrated cards, what
// you get in a bento grid (with the real Kane CLI results), and a closing call to action.
import Link from "next/link";
import { ArrowRight, Bot, FileSearch, FlaskConical, GitMerge, Github, Lock, RefreshCcw, ShieldCheck, Terminal, UserCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { LoopDemo } from "@/components/loop-demo";
import { Reveal, WordsIn } from "@/components/landing/motion";
import { ProofCard, Sandbox } from "@/components/landing/scenes";
import { IntroHost, WatchIntroButton } from "@/components/landing/intro";
import { BeaconTile, CommandVisual, ListVisual, OrbVisual, SilkCanyon, TerminalVisual } from "@/components/landing/visuals";

const REPO = "https://github.com/BernardOnuh/checkoutguard";
const TOOLS = ["Kane CLI", "Claude Code", "OpenCode", "Chrome", "Git worktrees", "Node.js", "SQLite"];

const INTRO = [
  { icon: FlaskConical, title: "Journeys tested by Kane CLI" },
  { icon: Bot, title: "Fixed by a sandboxed coding agent" },
  { icon: ShieldCheck, title: "Verified by a Kane rerun, merged by you" },
];

const HOW = [
  { title: "Kane tests", text: "A plain-English checkout objective, one assertion, a real browser.", visual: <OrbVisual /> },
  { title: "Evidence", text: "Kane's finding, diagnosis, screenshots and network log become the brief.", visual: <ListVisual /> },
  { title: "Agent fixes", text: "Claude Code or OpenCode patches the store in an isolated worktree.", visual: <CommandVisual /> },
  { title: "Kane verifies", text: "The same journey reruns. Only a Kane pass marks the repair verified.", visual: <TerminalVisual /> },
];

const PROOF = [
  { bug: "Cart subtotal ignores quantity", kane: "After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00.", fix: "subtotal() multiplies by quantity", file: "kane-cart-total" },
  { bug: "An expired coupon still applies", kane: "The cart accepted OLD20 and applied a 20% discount instead of showing that the coupon had expired.", fix: "checkCoupon() checks the expiry date", file: "kane-expired-coupon" },
  { bug: "Confirmation says “Order not found”", kane: "After placing the order, checkout redirected to an Order not found page instead of showing the customer confirmation and order number.", fix: "the confirmation page reads ?order=", file: "kane-order-confirmation" },
];

function Heading({ pill, title, sub }: { pill: string; title: string; sub?: string }) {
  return (
    <Reveal className="text-center">
      <span className="pill"><ShieldCheck className="h-3 w-3" />{pill}</span>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mute">{sub}</p>}
    </Reveal>
  );
}

export default function Home() {
  return (
    <div className="mono-site relative overflow-x-clip">
      <IntroHost />
      {/* header */}
      <header className="fixed inset-x-0 top-0 z-30 px-3">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/50 px-4 backdrop-blur-xl sm:px-5">
          <Logo href="/" />
          <nav className="hidden items-center gap-7 text-[13px] text-mute md:flex">
            <WatchIntroButton className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-white transition hover:bg-white/10" />
            <a href="#what" className="transition hover:text-white">Product</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#provide" className="transition hover:text-white">Proof</a>
            <a href="#install" className="transition hover:text-white">Install</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={REPO} className="btn-ghost hidden !rounded-full !px-3 !py-2 sm:inline-flex" aria-label="GitHub"><Github className="h-4 w-4" /></a>
            <Link href="/app" className="btn-light !rounded-full !py-2 text-[13px]">Open dashboard</Link>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <SilkCanyon />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center px-4 pt-36 text-center sm:pt-40">
          <span className="pill"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Built with Kane CLI</span>
          <h1 className="mt-7 text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[72px]">
            <WordsIn text="Every checkout tested." /><br />
            <WordsIn text="Every fix verified." start={360} wordClassName="text-neutral-400" />
          </h1>
          <Reveal delay={500}><p className="mt-6 text-lg text-mute">Kane-tested. Agent-fixed. Human-approved.</p></Reveal>
          <Reveal delay={700}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/app" className="btn-light !rounded-full !px-6 !py-3">Open the dashboard<ArrowRight className="h-4 w-4" /></Link>
              <WatchIntroButton className="btn-ghost !rounded-full !px-6 !py-3" />
            </div>
          </Reveal>
          <div className="mt-auto pb-10 pt-16"><BeaconTile /></div>
        </div>
      </section>

      {/* tools strip */}
      <div className="relative border-y border-white/5 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 text-[15px] font-semibold tracking-tight text-neutral-500">
          {TOOLS.map(t => <span key={t} className="transition hover:text-white">{t}</span>)}
        </div>
      </div>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------- what it is ---------- */}
        <section id="what" className="scroll-mt-24 py-28">
          <Heading pill="Introduction" title="What is CheckoutGuard?" sub="A closed loop for checkout code: Kane CLI tests every journey in a real browser, a coding agent fixes what Kane catches, and Kane proves the fix before a person merges it." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {INTRO.map((f, k) => (
              <Reveal key={f.title} delay={k * 100}>
                <div className="tile flex items-center gap-4 p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"><f.icon className="h-5 w-5 text-white" /></span>
                  <span className="text-[15px] font-medium leading-snug">{f.title}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="scroll-mt-24 py-16">
          <Heading pill="Test • Evidence • Fix • Verify" title="How it works" sub="Four steps, and nothing merges until a person says so." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map((h, k) => (
              <Reveal key={h.title} delay={k * 100}>
                <div className="tile flex h-[400px] flex-col overflow-hidden p-5">
                  <h3 className="text-center text-lg font-semibold">{h.title}</h3>
                  <p className="mt-2 text-center text-[13px] leading-relaxed text-mute">{h.text}</p>
                  <div className="mt-5 flex-1">{h.visual}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- what you get (bento) ---------- */}
        <section id="provide" className="scroll-mt-24 py-28">
          <Heading pill="Proven with real Kane CLI runs" title="What you get" sub="Three seeded checkout bugs: all caught by Kane, fixed by the agent, and verified by a Kane rerun. These are Kane's own words." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PROOF.map((p, k) => <Reveal key={p.file} delay={k * 100}><ProofCard {...p} order={k} /></Reveal>)}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <Reveal>
              <div className="tile h-full p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><RefreshCcw className="h-4 w-4" />The whole loop, replayed from a real run</div>
                <LoopDemo />
              </div>
            </Reveal>
            <div className="grid gap-4">
              <Reveal delay={100}>
                <div className="tile p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" />A sandboxed agent</div>
                  <p className="mt-1.5 text-[13px] text-mute">No shell, no web, its own worktree, and a patch that touches the tests is rejected.</p>
                  <div className="mt-2"><Sandbox /></div>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className="tile grid grid-cols-2 gap-4 p-5">
                  <div><FileSearch className="h-4 w-4" /><div className="mt-2 text-sm font-semibold">Repair reports</div><p className="mt-1 text-[12.5px] text-mute">Kane's steps, the patch, the checks and the rerun, in one HTML file.</p></div>
                  <div><GitMerge className="h-4 w-4" /><div className="mt-2 text-sm font-semibold">You merge</div><p className="mt-1 text-[12.5px] text-mute">Approve or discard in the dashboard. Nothing deploys.</p></div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- install ---------- */}
        <section id="install" className="scroll-mt-24 pb-28">
          <Heading pill="Run it tonight" title="Five commands to a verified fix" />
          <Reveal className="mx-auto mt-10 max-w-3xl">
            <div className="tile overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-mono text-[11px] text-mute">
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" /><span className="h-2.5 w-2.5 rounded-full bg-white/25" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <Terminal className="ml-2 h-3.5 w-3.5" />checkoutguard
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-[1.9] text-neutral-200">{`$ npm install -g @testmuai/kane-cli && kane-cli login
$ git clone ${REPO}
$ cd checkoutguard/dashboard && npm install && npm run dev
$ node runner/src/cli.js test all            `}<span className="text-neutral-500"># Kane runs every journey</span>{`
$ node runner/src/cli.js repair <failure>    `}<span className="text-neutral-500"># fix → Kane rerun → verified</span></pre>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- closing ---------- */}
      <section className="relative overflow-hidden border-t border-white/5 py-32 text-center">
        <div className="pointer-events-none absolute left-1/2 top-full h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-white/10 blur-3xl" />
        <Reveal className="relative px-4">
          <div className="mx-auto mb-8 w-fit"><BeaconTile /></div>
          <h2 className="mx-auto max-w-3xl text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">Ship checkouts that work.</h2>
          <p className="mx-auto mt-5 max-w-lg text-mute">Every journey tested by Kane CLI. Every fix proven by Kane before you merge it.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="btn-light !rounded-full !px-6 !py-3">Open the dashboard<ArrowRight className="h-4 w-4" /></Link>
            <a href={REPO} className="btn-ghost !rounded-full !px-6 !py-3"><Github className="h-4 w-4" />GitHub</a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5" />CheckoutGuard · built for the KaneCLI Hackathon · testing by <a href="https://www.testmuai.com/support/docs/kane-cli-introduction/" className="underline decoration-white/20 underline-offset-2 hover:text-white">Kane CLI</a></span>
          <span>The runner works on your machine only; it's never exposed publicly.</span>
        </div>
      </footer>
    </div>
  );
}
