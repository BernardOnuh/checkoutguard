// The build write-up for the KaneCLI Hackathon: the problem, the build, Kane in the loop, and what Kane caught,
// with screenshots from the real runs and links to the evidence records.
import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";
import { Logo } from "@/components/logo";

const REPO = "https://github.com/BernardOnuh/checkoutguard";

export const metadata = {
  title: "Making a coding agent prove its checkout fix with Kane CLI · CheckoutGuard",
  description: "How CheckoutGuard uses Kane CLI to catch checkout bugs in a real browser, hand them to a coding agent, and only call a fix verified when Kane passes the same journey again.",
};

function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-8">
      <img src={src} alt={alt} className="w-full rounded-2xl border border-white/10" />
      <figcaption className="mt-2 text-center text-[13px] text-mute">{caption}</figcaption>
    </figure>
  );
}

export default function Blog() {
  return (
    <div className="mono-site min-h-screen">
      <header className="px-3">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 backdrop-blur-xl sm:px-5">
          <Logo href="/" />
          <Link href="/" className="flex items-center gap-1.5 text-[13px] text-mute transition hover:text-white"><ArrowLeft className="h-4 w-4" />Home</Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 pb-24 pt-14 text-[16.5px] leading-[1.75] text-neutral-300 sm:px-6 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white [&_p]:mt-5 [&_b]:text-white [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[14px] [&_code]:text-white [&_a]:text-white [&_a]:underline [&_a]:decoration-white/30 [&_a]:underline-offset-4">
        <p className="pill !mt-0">KaneCLI Hackathon · build write-up</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl">Making a coding agent prove its checkout fix</h1>
        <p className="text-mute">CheckoutGuard: Kane CLI tests the checkout, an agent fixes what breaks, and Kane decides whether the fix counts.</p>

        <Shot src="/blog/flyer.jpg" alt="CheckoutGuard: every checkout tested, every fix verified" caption="The loop: Kane tests, the agent fixes, Kane reruns the same journey, a person approves." />

        <h2>The problem</h2>
        <p>A broken checkout costs a sale every time it happens, and it is exactly the kind of bug that ships: unit tests pass, code review looks fine, and nobody clicks through the whole journey before it goes out. Coding agents make this worse in one specific way. They say "done" when the code compiles and the tests they can see pass, and nothing ever loads the cart in a browser.</p>
        <p>So the question I built around was: <b>what if a coding agent's checkout fix only counted once a real browser agreed?</b></p>

        <h2>What I built</h2>
        <p>CheckoutGuard runs a loop against a store (a small demo store, Northwind Goods, with three seeded bugs):</p>
        <p><b>1. Kane tests the journey.</b> Each checkout journey is a plain-English Kane objective that ends in one assertion, like <code>…change the Ceramic Mug quantity to 3 and click Update. Assert that the Subtotal row in the cart totals shows $54.00.</code> CheckoutGuard runs <code>kane-cli run --agent</code> and reads its NDJSON stream. A <code>run_end</code> with <code>assertion_error.confirmed_product_bug</code> is a real bug; Kane's own errors (<code>agent_error.*</code>, <code>infra_error.*</code>) are retried once and never treated as a bug.</p>
        <p><b>2. The finding becomes evidence.</b> Kane's failed step, its diagnosis, screenshots from the evidence pack and the network log become the brief for the coding agent.</p>
        <p><b>3. An agent patches the store, sandboxed.</b> Claude Code (OpenCode also works) gets an isolated git worktree and file tools only: no shell, no web. A patch that touches anything outside <code>store/src/</code>, such as the tests or the Kane objectives, is rejected before it runs.</p>
        <p><b>4. A unit gate.</b> No regressions, and at least one failing test must now pass.</p>
        <p><b>5. Kane reruns the same journey.</b> Same objective, against the patched store. <b>Only a Kane pass marks the repair verified.</b></p>
        <p><b>6. A person approves the merge.</b> The dashboard shows the diff and Kane's before and after screenshots. Nothing merges on its own.</p>

        <h2>What Kane caught</h2>
        <p>Here is one real run. Three mugs at $18 should cost $54. The cart said $18.</p>
        <Shot src="/blog/02-cart-bug.jpg" alt="The demo store's cart: 3 Ceramic Mugs, line total $54.00, but Subtotal $18.00" caption="The bug: the line total is right, the subtotal isn't." />
        <p>Kane drove the journey in real Chrome and failed it, with a diagnosis that pointed straight at the cause: <i>"The cart updates the item quantity and line total but does not recalculate the subtotal shown in the order summary."</i></p>
        <Shot src="/blog/03-kane-found.jpg" alt="Kane's step-by-step run with the failing assertion and diagnosis" caption="Kane's run, step by step, ending in the failed assertion and its diagnosis." />
        <p>Claude Code read that evidence and found the bug in one line of <code>store/src/pricing.js</code>: the price was added once per line and never multiplied by the quantity.</p>

        <h2>The rerun that didn't pass</h2>
        <p>The most useful moment came next. The fix was right and the unit gate passed, but Kane's first rerun failed: the page showed $54.00, yet Kane's checker couldn't tie the value to its label. CheckoutGuard did what it's built to do and <b>refused to call the repair verified</b>. A failed rerun stays a failure; nothing merged.</p>
        <Shot src="/blog/04-first-rerun-not-verified.jpg" alt="Repair attempt 1: Kane's rerun failed, so the verdict is Not verified" caption="Attempt 1: correct patch, failed rerun, so not verified." />
        <p>I anchored the assertion to the cart totals row (<code>Assert that the Subtotal row in the cart totals shows $54.00</code>) and ran attempt 2. Kane passed it, and only then did the repair turn "Verified", still waiting for a person to approve the merge.</p>
        <Shot src="/blog/05-verified-fix.jpg" alt="Repair attempt 2: verified by a second run of the same journey, with the one-line diff" caption="Attempt 2: verified by Kane's rerun, waiting for approval." />
        <p>That is the point of putting Kane in the loop rather than at the end: the agent's confidence doesn't decide anything, the browser does.</p>

        <h2>Results</h2>
        <p>Across the three seeded checkout bugs, <b>Kane caught all three, the agent fixed all three, and Kane verified all three fixes</b> with a rerun of the same journey:</p>
        <p>• <b>Cart subtotal ignores quantity</b>, fixed by multiplying by quantity (<a href="/evidence/kane-cart-total.html">record</a>, and today's run: <a href="/evidence/kane-cart-total-live.html">report</a>)<br />• <b>An expired coupon still applies</b>, fixed by checking the expiry date (<a href="/evidence/kane-expired-coupon.html">record</a>)<br />• <b>Confirmation says "Order not found"</b>, fixed by reading the right query parameter (<a href="/evidence/kane-order-confirmation.html">record</a>)</p>
        <p>Each Kane run cost about 20 to 30 Kane credits.</p>

        <h2>What's next</h2>
        <p>Running the loop on every pull request in CI, so a checkout regression is caught and a verified fix is proposed before review; more journeys (mobile, payment edge cases, API calls inside objectives); and committing Kane tests so they can be replayed.</p>

        <h2>Try it</h2>
        <p>The dashboard runs on your own machine, because it runs Kane CLI and lets an agent change code with your credits and sign-ins. Clone the repo, run <code>npm run dev</code> in <code>dashboard/</code>, and open <code>/app</code>.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={REPO} className="btn-light !rounded-full !no-underline"><Github className="h-4 w-4" />GitHub repo</a>
          <Link href="/deck" className="btn-ghost !rounded-full !no-underline">The deck</Link>
        </div>
      </article>
    </div>
  );
}
