import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Wrench, XCircle } from "lucide-react";
import { runner } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { BrowserShot, Pill, TesterTag, evidenceUrl, when } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const run = runner.run((await params).id);
  if (!run) notFound();
  const sc = runner.scenario(run.scenario);
  const steps: { name: string; status: string; expected: string; actual: string; evidence: string | null }[] = JSON.parse(run.steps);
  const failure = runner.failureOfRun(run.id);
  const attempts = failure ? runner.attemptsOf(failure.id) : [];
  const left = runner.maxAttempts - attempts.length;
  const shot = evidenceUrl(steps.find(s => s.evidence)?.evidence);
  const repairOf = run.target.startsWith("repair:") ? run.target.slice(7) : null;

  return (
    <div className="space-y-6">
      <LiveRefresh active={run.status === "running" || attempts.some(a => a.status === "running")} />
      <Link href={repairOf ? `/repairs/${repairOf}` : "/app"} className="inline-flex items-center gap-1.5 text-sm font-medium text-mute transition hover:text-ink"><ArrowLeft className="h-4 w-4" />{repairOf ? "Repair record" : "All journeys"}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="pill">{repairOf ? "Retest of a repair" : "Test run"} · <span className="mono normal-case tracking-normal">{run.id}</span></p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{sc?.title ?? run.scenario}</h1>
          <p className="mt-1 text-sm text-mute">{when(run.started_at)} · <TesterTag runner={run.runner} /></p>
        </div>
        <Pill status={run.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-semibold">Journey</h2>
            <ol className="mt-4 space-y-3 text-sm">{sc?.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-[11px] text-mute ring-1 ring-white/10">{i + 1}</span><span className="pt-0.5 text-ink/90">{s}</span></li>)}</ol>
          </section>
          <section className="card">
            <h2 className="font-semibold">Checks</h2>
            <ul className="mt-3 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className={`rounded-xl p-3.5 text-sm ring-1 ${s.status === "passed" ? "bg-white/[0.06] ring-white/30" : "bg-transparent ring-0 border border-dashed border-white/25"}`}>
                  <p className="flex items-center gap-2 font-semibold">{s.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-white" /> : <XCircle className="h-4 w-4 text-neutral-400" />}{s.name}</p>
                  <dl className="mt-2 grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5 text-[13px]">
                    <dt className="text-mute">Expected</dt><dd className="mono !text-[13px] text-white">{s.expected}</dd>
                    <dt className="text-mute">Actual</dt><dd className={`mono !text-[13px] ${s.status === "passed" ? "text-white" : "text-neutral-400"}`}>{s.actual}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
          {failure && !repairOf && (
            <section className="card space-y-3">
              <h2 className="flex items-center gap-2 font-semibold"><Wrench className="h-4 w-4" />Repair</h2>
              <p className="text-sm text-mute">The coding agent gets this evidence and patches <span className="mono">store/src/</span> in an isolated worktree. Then the unit checks and this same journey run again. {left > 0 ? `${left} of ${runner.maxAttempts} attempts left.` : "No attempts left."}</p>
              {attempts.map(a => <Link key={a.id} href={`/repairs/${a.id}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm ring-1 ring-white/10 transition hover:bg-white/[0.06]"><span>Attempt {a.attempt}</span><Pill status={a.status} /></Link>)}
              {left > 0 && !attempts.some(a => a.status === "running") && (
                <ActionButton action="repair" id={failure.id} openRepair>
                  <Wrench className="h-4 w-4" />Start repair attempt {attempts.length + 1}
                </ActionButton>
              )}
            </section>
          )}
        </div>
        <section className="card lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-semibold">Evidence</h2>
          <div className="mt-4"><BrowserShot src={shot} tone={run.status === "passed" ? "pass" : "fail"} url={`northwind.test · ${run.scenario}`} /></div>
          {run.log_path && <a className="btn-ghost mt-4 !py-2 text-xs" href={evidenceUrl(run.log_path)!} target="_blank">Action log <ArrowRight className="h-3.5 w-3.5" /></a>}
        </section>
      </div>
    </div>
  );
}
