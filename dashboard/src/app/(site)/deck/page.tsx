// The pitch deck for the KaneCLI Hackathon: problem, build, Kane in the loop, demo, results, what's next.
// Full-screen slides that snap as you scroll (arrow keys and Page Down work too).
import { Check, Play, X } from "lucide-react";
import { Badge } from "@/components/logo";
import { DEMO_URL } from "@/lib/public-site";

const REPO = "https://github.com/BernardOnuh/checkoutguard";

export const metadata = { title: "Deck · CheckoutGuard" };

function Slide({ n, kicker, children }: { n: number; kicker: string; children: React.ReactNode }) {
  return (
    <section className="relative flex h-screen snap-start flex-col justify-center px-8 sm:px-20">
      <p className="pill absolute left-8 top-8 sm:left-20">{kicker}</p>
      <span className="absolute bottom-8 right-8 font-mono text-xs text-mute sm:right-20">{n} / 7</span>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

const LOOP = [
  ["Kane tests", "A plain-English objective with one assertion, run in real Chrome with kane-cli run --agent."],
  ["Evidence", "Kane's failed step, diagnosis, screenshots and network log become the agent's brief."],
  ["Agent fixes", "Claude Code in an isolated git worktree, file tools only. Touching tests gets the patch rejected."],
  ["Unit gate", "No regressions, and at least one failing test now passes."],
  ["Kane reruns", "The same journey on the patched store. Only a Kane pass marks it verified."],
  ["You approve", "Diff plus Kane's before and after. Nothing merges by itself."],
];

const BUGS = [
  ["Cart subtotal ignores quantity", "$18.00 for 3 × $18 mugs", "price × quantity", "kane-cart-total"],
  ["Expired coupon still applies", "OLD20 took 20% off", "checkCoupon() checks expiry", "kane-expired-coupon"],
  ["Confirmation says “Order not found”", "no order number shown", "reads ?order=", "kane-order-confirmation"],
];

export default function Deck() {
  return (
    <div className="mono-site h-screen snap-y snap-mandatory overflow-y-scroll">
      <Slide n={1} kicker="KaneCLI Hackathon">
        <div className="flex flex-col items-center text-center">
          <Badge className="h-36 w-36 drop-shadow-[0_0_40px_rgb(255_255_255/0.45)]" />
          <h1 className="mt-8 text-5xl font-semibold tracking-[-0.03em] sm:text-7xl">CheckoutGuard</h1>
          <p className="mt-4 text-2xl text-neutral-400">Every checkout tested. Every fix verified.</p>
          <p className="mt-8 text-mute">Kane-tested. Agent-fixed. Human-approved. · checkoutguard-eight.vercel.app</p>
        </div>
      </Slide>

      <Slide n={2} kicker="The problem">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">A broken checkout costs a sale <span className="text-neutral-400">every single time.</span></h2>
        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-mute">These bugs ship because unit tests pass and nobody clicks through the whole journey. Coding agents make it worse: they say “done” when the tests they can see pass, and nothing ever loads the cart in a real browser.</p>
        <p className="mt-6 text-xl text-white">What if an agent's fix only counted once a real browser agreed?</p>
      </Slide>

      <Slide n={3} kicker="The build">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">One loop, six steps</h2>
        <ol className="mt-10 grid gap-3 sm:grid-cols-3">
          {LOOP.map(([t, d], i) => (
            <li key={t} className={`card !p-5 ${i === 4 ? "!border-white/50 shadow-[0_0_50px_-20px_rgb(255_255_255/0.7)]" : ""}`}>
              <span className="font-mono text-xs text-mute">0{i + 1}</span>
              <p className="mt-2 text-lg font-semibold">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </Slide>

      <Slide n={4} kicker="Kane in the loop">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Kane decides, <span className="text-neutral-400">not the agent.</span></h2>
            <ul className="mt-8 space-y-3 text-lg text-neutral-300">
              <li>• <span className="font-mono text-base text-white">run_end</span> with <span className="font-mono text-base text-white">confirmed_product_bug</span> = a real bug</li>
              <li>• Kane's own errors are retried once, never called a bug</li>
              <li>• The evidence pack is the agent's brief</li>
              <li>• A failed rerun stays a failure</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black p-5 font-mono text-[13px] leading-relaxed text-neutral-300">
            <p className="text-neutral-500">$ kane-cli run "…Assert that the Subtotal row in the cart totals shows $54.00." --agent</p>
            <p className="mt-3 text-red-300">✕ the Subtotal is $54.00: the cart still displays a subtotal of $18.00</p>
            <p className="mt-1 text-neutral-500">  diagnosis: subtotal not recalculated after Update</p>
            <p className="mt-3 text-white">agent: cents += product.priceCents * line.qty;</p>
            <p className="mt-3 text-green-300">✓ Kane verified: the Subtotal row in the cart totals shows $54.00.</p>
          </div>
        </div>
      </Slide>

      <Slide n={5} kicker="Demo">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">A live run, start to finish</h2>
            <p className="mt-6 text-lg leading-relaxed text-mute">Kane caught the cart bug, Claude Code fixed it in one line, and the first rerun failed on Kane's check, so CheckoutGuard refused to verify it. Attempt 2 passed.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {DEMO_URL && <a href={DEMO_URL} className="btn-light !rounded-full"><Play className="h-4 w-4" fill="currentColor" />Watch the demo</a>}
              <a href="/evidence/kane-cart-total-live.html" className="btn-ghost !rounded-full">Kane run report</a>
              <a href="/blog" className="btn-ghost !rounded-full">Write-up</a>
            </div>
          </div>
          <img src="/blog/05-verified-fix.jpg" alt="Verified repair with the one-line diff" className="rounded-2xl border border-white/10" />
        </div>
      </Slide>

      <Slide n={6} kicker="Results">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl"><span className="text-green-400">3 / 3</span> seeded bugs caught, fixed and verified by Kane</h2>
        <div className="mt-10 space-y-3">
          {BUGS.map(([bug, before, fix, file]) => (
            <a key={file} href={`/evidence/${file}.html`} className="grid items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/30 sm:grid-cols-[1.3fr_1fr_1fr]">
              <span className="font-semibold">{bug}</span>
              <span className="flex items-center gap-2 text-red-300"><X className="h-4 w-4" />{before}</span>
              <span className="flex items-center gap-2 text-green-300"><Check className="h-4 w-4" />{fix}</span>
            </a>
          ))}
        </div>
        <p className="mt-6 text-mute">Each row opens its repair record. About 20 to 30 Kane credits per run.</p>
      </Slide>

      <Slide n={7} kicker="What's next">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Next</h2>
        <ul className="mt-8 space-y-4 text-xl text-neutral-300">
          <li>• The loop on every pull request, in CI</li>
          <li>• More journeys: mobile, payment edge cases, API calls inside objectives</li>
          <li>• Kane tests committed and replayed</li>
        </ul>
        <p className="mt-12 text-lg text-white">checkoutguard-eight.vercel.app · <a href={REPO} className="underline decoration-white/30 underline-offset-4">github.com/BernardOnuh/checkoutguard</a></p>
      </Slide>
    </div>
  );
}
