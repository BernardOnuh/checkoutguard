import Link from "next/link";
import { ArrowRight, Play, Wrench } from "lucide-react";
import { runner } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { Pill, TesterTag, when } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function Overview() {
  const scenarios = runner.scenarios();
  const latest = Object.fromEntries(scenarios.map(s => [s.id, runner.latestOriginal(s.id)]));
  const repairs = runner.attempts(8);
  const running = Object.values(latest).some(r => r?.status === "running") || repairs.some(a => a.status === "running");
  const tester = runner.tester();
  const counts = { passed: 0, failed: 0 };
  for (const r of Object.values(latest)) if (r?.status === "passed") counts.passed++; else if (r) counts.failed++;

  return (
    <div className="space-y-8">
      <LiveRefresh active={running} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-guard">Northwind Goods · demo store</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Checkout journeys</h1>
          <p className="mt-1 text-mute">{counts.passed} passing, {counts.failed} failing · tested with <TesterTag runner={tester} /></p>
        </div>
        <ActionButton action="test" id="all"><Play className="h-4 w-4" />Run all journeys</ActionButton>
      </div>

      {tester !== "kane" && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Kane CLI isn't set up yet, so journeys run with the <b>local stand-in check</b>. Those runs are labelled and never count as Kane evidence.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map(s => {
          const r = latest[s.id];
          const f = r ? runner.failureOfRun(r.id) : null;
          return (
            <div key={s.id} className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold leading-snug">{s.title}</h2>
                <Pill status={r?.status ?? "none"} />
              </div>
              <p className="text-sm text-mute">{s.objective}</p>
              {f && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm">
                  <p className="font-semibold text-rose-800">{f.step}</p>
                  <p className="mt-1 text-rose-900/80">Expected <b>{f.expected}</b>, got <b>{f.actual}</b></p>
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <ActionButton action="test" id={s.id} kind="btn-ghost"><Play className="h-4 w-4" />Run</ActionButton>
                {r && <Link href={`/runs/${r.id}`} className="btn-ghost">Evidence <ArrowRight className="h-4 w-4" /></Link>}
              </div>
              {r && <p className="text-xs text-mute">Last run {when(r.started_at)} · <TesterTag runner={r.runner} /></p>}
            </div>
          );
        })}
      </div>

      <section className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 font-bold"><Wrench className="h-4 w-4" />Repair attempts</h2>
          <span className="text-xs text-mute">At most {runner.maxAttempts} per failure · merging needs your approval</span>
        </div>
        {repairs.length === 0 ? <p className="p-5 text-sm text-mute">No repairs yet. Open a failing journey's evidence and start one.</p> : (
          <ul className="divide-y divide-line">
            {repairs.map(a => (
              <li key={a.id}>
                <Link href={`/repairs/${a.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{runner.scenario(a.scenario)?.title ?? a.scenario} <span className="font-normal text-mute">· attempt {a.attempt}</span></p>
                    <p className="mono truncate text-mute">{a.branch} · {when(a.created_at)}</p>
                  </div>
                  <Pill status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
