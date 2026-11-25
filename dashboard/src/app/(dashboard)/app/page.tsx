import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, FlaskConical, Gift, Play, Receipt, RefreshCcw, ShieldCheck, ShoppingCart, Sparkles, UserCheck, Wrench } from "lucide-react";
import { runner, type Attempt, type Run } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { Pill, Pipeline, TesterTag, when } from "@/components/ui";

export const dynamic = "force-dynamic";

const ICONS: Record<string, typeof ShoppingCart> = { "cart-total": ShoppingCart, "expired-coupon": Gift, "order-confirmation": Receipt };

/** Where a repair attempt really got to. A discarded attempt is stored as "rejected" but may have been verified first. */
function outcome(a: Attempt) {
  const v = runner.verificationOf(a.id);
  const rerun = v ? runner.run(v.rerun_id) : null;
  const verified = a.status === "verified" || a.status === "merged" || (a.status === "rejected" && rerun?.status === "passed");
  return { verified, discarded: a.status === "rejected" && verified, patched: !!a.patch_diff.trim() };
}

/** Kane's finding, without the diagnosis and credit count the runner appends to it. */
const finding = (actual: string) => actual.split(/\s*Kane's diagnosis:/)[0].trim();

export default function Overview() {
  const scenarios = runner.scenarios();
  const latest: Record<string, Run | null> = Object.fromEntries(scenarios.map(s => [s.id, runner.latestOriginal(s.id)]));
  const allAttempts = runner.attempts(200);
  const repairs = allAttempts.slice(0, 8);
  const running = Object.values(latest).some(r => r?.status === "running") || repairs.some(a => a.status === "running");
  const tester = runner.tester();

  const found = Object.values(latest).filter(r => r && r.status !== "passed" && r.status !== "running").length;
  const outcomes = allAttempts.map(outcome);
  const patched = outcomes.filter(o => o.patched).length;
  const verified = outcomes.filter(o => o.verified).length;
  const waiting = allAttempts.filter(a => a.status === "verified").length;
  const merged = allAttempts.filter(a => a.status === "merged").length;

  const LOOP = [
    { n: "01", icon: FlaskConical, title: "Kane tests the checkout", text: "Kane CLI shops your store in a real browser, like a customer, and checks one thing per journey.", stat: `${found} of ${scenarios.length} journeys failing` },
    { n: "02", icon: Bot, title: "An agent writes the fix", text: "Kane's finding goes to Claude Code, which patches the store in a sandboxed copy. It can't touch anything else.", stat: `${patched} patches written` },
    { n: "03", icon: RefreshCcw, title: "Kane checks the fix", text: "The same journey runs again on the patched store. Only a Kane pass marks a fix as verified.", stat: `${verified} verified by Kane` },
    { n: "04", icon: UserCheck, title: "You approve the merge", text: "You see the diff and the before and after. Nothing merges unless you approve it.", stat: waiting ? `${waiting} waiting for you` : `${merged} merged` },
  ];

  return (
    <div className="space-y-14">
      <LiveRefresh active={running} />

      {/* what this is */}
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="pill"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Northwind Goods · demo storefront</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Checkout <span className="text-neutral-400">health.</span></h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mute">
            CheckoutGuard finds checkout bugs before your customers do. <span className="text-ink">Kane CLI</span> tests each journey, a
            coding agent fixes what breaks, and Kane tests it again. A fix only counts when Kane passes it, and only you can merge it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/#how" className="btn-ghost">How it works</Link>
          <ActionButton action="test" id="all"><Play className="h-4 w-4" fill="currentColor" />Run all journeys</ActionButton>
        </div>
      </section>

      {/* the loop, with live numbers */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><RefreshCcw className="h-3.5 w-3.5" />The loop</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {LOOP.map((s, i) => (
            <li key={s.n} className="card relative flex flex-col !p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/15"><s.icon className="h-5 w-5" /></span>
                <span className="font-mono text-xs text-mute">{s.n}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-mute">{s.text}</p>
              <p className="mt-4 border-t border-line pt-3 text-sm font-semibold text-white">{s.stat}</p>
              {i < LOOP.length - 1 && <ArrowRight className="absolute -right-[11px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-black text-neutral-500 md:block" />}
            </li>
          ))}
        </ol>
      </section>

      {tester !== "kane" && (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3 text-sm text-neutral-300">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white" />
          <p>Kane CLI isn't connected yet, so journeys run with the <b className="text-white">local stand-in check</b>. Those runs are labelled and never count as Kane evidence.</p>
        </div>
      )}

      {/* each journey: what a customer does, what Kane found, where the fix is, and what to do next */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><ShieldCheck className="h-3.5 w-3.5" />Checkout journeys</h2>
          <span className="text-xs text-mute">Each one is a real customer path through the store</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map(s => {
            const r = latest[s.id];
            const f = r ? runner.failureOfRun(r.id) : null;
            const tries = f ? runner.attemptsOf(f.id) : [];
            const last = tries.at(-1) ?? null;
            const o = last ? outcome(last) : null;
            const Icon = ICONS[s.id] ?? ShoppingCart;
            const bad = !!r && r.status !== "passed" && r.status !== "running";
            const left = runner.maxAttempts - tries.length;

            // Pipeline position and the plain-English state of this journey's latest repair.
            let stage = -1, failedAt: number | undefined, note = "";
            if (bad) {
              stage = 0;
              if (!last) note = "Kane found a bug. No fix has been tried yet.";
              else if (last.status === "running") { stage = 1; note = "The agent is working on a fix right now."; }
              else if (last.status === "merged") { stage = 3; note = "Fixed, verified by Kane and merged by you."; }
              else if (last.status === "verified") { stage = 2; note = "Kane verified a fix. It's waiting for your approval."; }
              else if (o?.discarded) { stage = 2; note = "Kane verified a fix, but it was discarded, so the bug is still in the store."; }
              else { stage = 1; failedAt = last.status === "retest_failed" || last.status === "unit_failed" ? 2 : 1; note = "The last fix didn't pass. The bug is still there."; }
            }

            return (
              <article key={s.id} className={`card relative flex flex-col gap-5 overflow-hidden transition hover:-translate-y-0.5 hover:border-white/25 ${bad ? "!border-dashed !border-white/25" : ""}`}>
                <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${r?.status === "passed" ? "bg-white/15" : "bg-white/[0.06]"}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${r?.status === "passed" ? "bg-white text-black ring-white" : "bg-white/5 text-ink ring-white/15"}`}><Icon className="h-5 w-5" /></span>
                  <Pill status={r?.status ?? "none"} />
                </div>

                <div className="relative">
                  <h3 className="text-[17px] font-semibold leading-snug">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mute"><span className="text-neutral-300">The customer:</span> {s.objective}</p>
                </div>

                {f ? (
                  <div className="relative rounded-xl border border-dashed border-white/20 bg-black/40 p-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400"><FlaskConical className="h-3.5 w-3.5" />What Kane found</p>
                    <p className="mt-2 text-[13px] leading-snug text-ink">“{finding(f.actual)}”</p>
                    <p className="mt-2 text-[12px] text-mute">Expected: <span className="text-white">{f.expected}</span></p>
                  </div>
                ) : r?.status === "passed" ? (
                  <p className="relative flex items-center gap-2 rounded-xl bg-white/[0.08] p-3.5 text-sm text-white ring-1 ring-white/30"><ShieldCheck className="h-4 w-4" />Kane passed this journey. Customers can complete it.</p>
                ) : !r ? (
                  <p className="relative rounded-xl bg-white/[0.03] p-3.5 text-sm text-mute ring-1 ring-white/10">Not tested yet. Run it to have Kane check it.</p>
                ) : null}

                {stage >= 0 && (
                  <div className="relative space-y-2">
                    <Pipeline stage={stage} failedAt={failedAt} />
                    <p className="text-[12px] leading-snug text-neutral-300">{note}</p>
                  </div>
                )}

                <div className="relative mt-auto space-y-3 pt-1">
                  {f && last?.status === "verified" ? (
                    <Link href={`/repairs/${last.id}`} className="btn-primary w-full"><UserCheck className="h-4 w-4" />Review and approve</Link>
                  ) : f && last?.status === "running" ? (
                    <Link href={`/repairs/${last.id}`} className="btn-ghost w-full"><Bot className="h-4 w-4 animate-pulse" />Watch the repair</Link>
                  ) : f && left > 0 && last?.status !== "merged" ? (
                    <ActionButton action="repair" id={f.id} kind="btn-primary w-full" openRepair><Wrench className="h-4 w-4" />Fix it with the agent</ActionButton>
                  ) : null}
                  <div className="flex gap-2">
                    <ActionButton action="test" id={s.id} kind="btn-ghost !px-3 !py-2"><Play className="h-3.5 w-3.5" />{r ? "Test again" : "Test"}</ActionButton>
                    {r && <Link href={`/runs/${r.id}`} className="btn-ghost flex-1 !px-3 !py-2">Kane's evidence<ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                  </div>
                  {r && <p className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-mute"><span>Last tested {when(r.started_at)}</span><TesterTag runner={r.runner} /></p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><Wrench className="h-3.5 w-3.5" />Repair history</h2>
          <span className="text-xs text-mute">Up to {runner.maxAttempts} tries per bug · merging needs your approval</span>
        </div>
        <div className="card !p-0 overflow-hidden">
          {repairs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10"><Wrench className="h-5 w-5 text-mute" /></span>
              <p className="mt-3 font-medium">No repairs yet</p>
              <p className="mt-1 text-sm text-mute">When Kane finds a bug, press “Fix it with the agent” on that journey.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {repairs.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/repairs/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-mute ring-1 ring-white/10"><Wrench className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{runner.scenario(a.scenario)?.title ?? a.scenario} <span className="text-mute">· try {a.attempt}</span></p>
                      <p className="mono mt-0.5 truncate text-mute">{a.branch} · {when(a.created_at)}</p>
                    </div>
                    <Pill status={outcomes[i].discarded ? "discarded" : a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
