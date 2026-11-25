import Link from "next/link";
import { ArrowUpRight, Gift, Play, Receipt, ShieldCheck, ShoppingCart, Sparkles, Wrench } from "lucide-react";
import { runner } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { Pill, Pipeline, TesterTag, when } from "@/components/ui";

export const dynamic = "force-dynamic";

const ICONS: Record<string, typeof ShoppingCart> = { "cart-total": ShoppingCart, "expired-coupon": Gift, "order-confirmation": Receipt };

export default function Overview() {
  const scenarios = runner.scenarios();
  const latest = Object.fromEntries(scenarios.map(s => [s.id, runner.latestOriginal(s.id)]));
  const repairs = runner.attempts(8);
  const running = Object.values(latest).some(r => r?.status === "running") || repairs.some(a => a.status === "running");
  const tester = runner.tester();
  const passing = Object.values(latest).filter(r => r?.status === "passed").length;
  const failing = Object.values(latest).filter(r => r && r.status !== "passed" && r.status !== "running").length;
  const verified = repairs.filter(a => a.status === "verified" || a.status === "merged").length;
  const pending = repairs.filter(a => a.status === "verified").length;

  // Where each journey's latest repair has got to, for its pipeline.
  const stageOf = (scenarioId: string, run: ReturnType<typeof runner.latestOriginal>) => {
    if (!run || run.status === "passed") return { stage: -1 };
    const f = runner.failureOfRun(run.id);
    const a = f ? runner.attemptsOf(f.id).at(-1) : null;
    if (!a) return { stage: 0 };
    if (a.status === "merged") return { stage: 3 };
    if (a.status === "verified") return { stage: 2 };
    if (a.status === "running") return { stage: 1 };
    return { stage: 1, failedAt: a.status === "retest_failed" || a.status === "unit_failed" ? 2 : 1 };
  };

  return (
    <div className="space-y-10">
      <LiveRefresh active={running} />

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="pill"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Northwind Goods · demo storefront</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Checkout <span className="text-neutral-400">health.</span></h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mute">Each journey runs in a real browser. Failures become evidence, an agent patches the code in isolation, and the same journey reruns before anything can merge.</p>
        </div>
        <ActionButton action="test" id="all"><Play className="h-4 w-4" fill="currentColor" />Run all journeys</ActionButton>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "Journeys passing", v: `${passing}/${scenarios.length}`, lit: passing === scenarios.length },
          { k: "Open failures", v: failing, alert: failing > 0 },
          { k: "Repairs verified", v: verified, lit: verified > 0 },
          { k: "Awaiting approval", v: pending, alert: pending > 0 },
        ].map(t => (
          <div key={t.k} className={`card !p-5 ${t.lit ? "!border-white/30 shadow-[0_0_50px_-24px_rgb(255_255_255/0.6)]" : t.alert ? "!border-dashed !border-white/30" : ""}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{t.k}</p>
            <p className={`mt-2 text-4xl font-semibold tracking-tight ${t.lit || t.alert ? "text-white" : "text-neutral-400"}`}>{t.v}</p>
          </div>
        ))}
      </section>

      {tester !== "kane" && (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3 text-sm text-neutral-300">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white" />
          <p>Kane CLI isn't connected yet, so journeys run with the <b className="text-white">local stand-in check</b>. Those runs are labelled and never count as Kane evidence.</p>
        </div>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><ShieldCheck className="h-3.5 w-3.5" />Journeys</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map(s => {
            const r = latest[s.id];
            const f = r ? runner.failureOfRun(r.id) : null;
            const Icon = ICONS[s.id] ?? ShoppingCart;
            const p = stageOf(s.id, r);
            const bad = r && r.status !== "passed" && r.status !== "running";
            return (
              <article key={s.id} className={`card group relative flex flex-col gap-5 overflow-hidden transition hover:-translate-y-0.5 hover:border-white/25 ${bad ? "!border-dashed !border-white/25" : ""}`}>
                <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${r?.status === "passed" ? "bg-white/15" : "bg-white/[0.06]"}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${r?.status === "passed" ? "bg-white text-black ring-white" : "bg-white/5 text-ink ring-white/15"}`}><Icon className="h-5 w-5" /></span>
                  <Pill status={r?.status ?? "none"} />
                </div>
                <div className="relative">
                  <h3 className="text-[17px] font-semibold leading-snug">{s.title}</h3>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-mute">{s.objective}</p>
                </div>
                {f ? (
                  <div className="relative rounded-xl border border-dashed border-white/20 bg-black/40 p-3.5">
                    <p className="text-xs font-medium text-neutral-300">{f.step}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div><p className="text-[10px] uppercase tracking-wider text-mute">Expected</p><p className="mono mt-0.5 !text-[13px] text-white">{f.expected}</p></div>
                      <div><p className="text-[10px] uppercase tracking-wider text-mute">Actual</p><p className="mono mt-0.5 !text-[13px] text-neutral-400">{f.actual}</p></div>
                    </div>
                  </div>
                ) : r?.status === "passed" ? (
                  <p className="relative rounded-xl bg-white/[0.08] p-3.5 text-sm text-white ring-1 ring-white/30">All checks passed.</p>
                ) : null}
                {p.stage >= 0 && <div className="relative"><Pipeline stage={p.stage} failedAt={p.failedAt} /></div>}
                <div className="relative mt-auto space-y-3 pt-1">
                  <div className="flex gap-2">
                    <ActionButton action="test" id={s.id} kind="btn-ghost !px-3 !py-2"><Play className="h-3.5 w-3.5" />Run</ActionButton>
                    {r && <Link href={`/runs/${r.id}`} className="btn-ghost flex-1 !px-3 !py-2">View evidence<ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                  </div>
                  {r && <p className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-mute"><span>Last run {when(r.started_at)}</span><TesterTag runner={r.runner} /></p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><Wrench className="h-3.5 w-3.5" />Repair attempts</h2>
          <span className="text-xs text-mute">Max {runner.maxAttempts} per failure · merging needs your approval</span>
        </div>
        <div className="card !p-0 overflow-hidden">
          {repairs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10"><Wrench className="h-5 w-5 text-mute" /></span>
              <p className="mt-3 font-medium">No repairs yet</p>
              <p className="mt-1 text-sm text-mute">Open a failing journey's evidence and start one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {repairs.map(a => (
                <li key={a.id}>
                  <Link href={`/repairs/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-mute ring-1 ring-white/10"><Wrench className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{runner.scenario(a.scenario)?.title ?? a.scenario} <span className="text-mute">· attempt {a.attempt}</span></p>
                      <p className="mono mt-0.5 truncate text-mute">{a.branch} · {when(a.created_at)}</p>
                    </div>
                    <Pill status={a.status} />
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
