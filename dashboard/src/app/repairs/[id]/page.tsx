import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Download, CheckCircle2, CircleDashed, FlaskConical, GitMerge, PlayCircle, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { runner } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { Diff, Pill, TesterTag, evidenceUrl, when } from "@/components/ui";

export const dynamic = "force-dynamic";

type Stage = { label: string; state: "done" | "failed" | "running" | "waiting"; detail?: string; Icon: typeof Bot };

export default async function RepairPage({ params }: { params: Promise<{ id: string }> }) {
  const a = runner.attempt((await params).id);
  if (!a) notFound();
  const failure = runner.failure(a.failure_id)!;
  const original = runner.run(failure.run_id)!;
  const sc = runner.scenario(original.scenario);
  const ver = runner.verificationOf(a.id);
  const rerun = ver ? runner.run(ver.rerun_id) : null;
  const s = a.status;
  const agentDone = !(s === "running" && !a.patch_diff);
  const stages: Stage[] = [
    { label: "Checkout test failed", state: "done", detail: `${failure.step}: expected ${failure.expected}, got ${failure.actual}`, Icon: XCircle },
    { label: "Agent patched the code in an isolated worktree", state: s === "agent_failed" || s === "rejected" ? "failed" : agentDone ? "done" : "running", detail: s === "rejected" ? "Patch touched files outside store/src/ and was rejected." : s === "agent_failed" ? "No usable patch." : a.branch, Icon: Bot },
    { label: "Unit checks", state: s === "unit_failed" ? "failed" : ["verified", "retest_failed", "merged"].includes(s) || rerun ? "done" : s === "running" && agentDone ? "running" : "waiting", detail: a.unit_log.split("\n").slice(0, 3).join(" · "), Icon: FlaskConical },
    { label: "Same journey rerun", state: s === "retest_failed" ? "failed" : rerun?.status === "passed" ? "done" : rerun?.status === "running" ? "running" : "waiting", detail: rerun ? `${rerun.status} · ${rerun.runner === "kane" ? "Kane CLI" : "local check"}` : undefined, Icon: PlayCircle },
    { label: s === "merged" ? "Merged after approval" : "Verdict", state: s === "verified" || s === "merged" ? "done" : ["unit_failed", "retest_failed", "agent_failed", "rejected"].includes(s) ? "failed" : "waiting", detail: s === "verified" ? "Verified: the original failure is resolved. Waiting for your approval." : s === "merged" ? `Merged into the main branch.` : undefined, Icon: ShieldCheck },
  ];
  const before = evidenceUrl(original.steps && JSON.parse(original.steps).find((x: { evidence?: string }) => x.evidence)?.evidence);
  const after = rerun ? evidenceUrl(JSON.parse(rerun.steps).find((x: { evidence?: string }) => x.evidence)?.evidence) : null;

  return (
    <div className="space-y-6">
      <LiveRefresh active={s === "running"} />
      <Link href={`/runs/${original.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink"><ArrowLeft className="h-4 w-4" />Failed run</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-guard">Repair record · attempt {a.attempt} of {runner.maxAttempts}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{sc?.title ?? original.scenario}</h1>
          <p className="mono mt-1 text-mute">{a.branch} · started {when(a.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          {s !== "running" && <a href={`/api/report?id=${a.id}`} className="btn-ghost !py-1.5 text-xs"><Download className="h-3.5 w-3.5" />Report</a>}
          <Pill status={s} />
        </div>
      </div>

      <section className="card">
        <ol className="space-y-4">
          {stages.map((st, i) => (
            <li key={i} className="flex gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${st.state === "done" ? (i === 0 ? "bg-rose-500 text-white" : "bg-emerald-500 text-white") : st.state === "failed" ? "bg-rose-500 text-white" : st.state === "running" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                {st.state === "waiting" ? <CircleDashed className="h-4 w-4" /> : st.state === "failed" ? <XCircle className="h-4 w-4" /> : st.state === "running" ? <st.Icon className="h-4 w-4 animate-pulse" /> : i === 0 ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-semibold">{st.label}</p>
                {st.detail && <p className="mono mt-0.5 break-words text-mute">{st.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {s === "verified" && (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-emerald-200 bg-emerald-50/60">
          <div>
            <p className="font-bold text-emerald-800">Verified by a second run of the same journey.</p>
            <p className="text-sm text-emerald-900/80">Review the diff below. Nothing is merged until you approve it.</p>
          </div>
          <div className="flex gap-2">
            <ActionButton action="discard" id={a.id} kind="btn-danger" confirm="Discard this repair? Its record stays, the branch is deleted."><Trash2 className="h-4 w-4" />Discard</ActionButton>
            <ActionButton action="approve" id={a.id} kind="btn-success" confirm={`Merge ${a.branch} into the main branch?`}><GitMerge className="h-4 w-4" />Approve and merge</ActionButton>
          </div>
        </section>
      )}
      {["unit_failed", "retest_failed", "agent_failed", "rejected"].includes(s) && (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-rose-200 bg-rose-50/60">
          <p className="text-sm text-rose-900"><b>Not verified.</b> A failed retest stays a failure. {failure && runner.attemptsOf(failure.id).length < runner.maxAttempts ? "You can start another attempt from the failed run." : "The attempt limit is reached."}</p>
          {s !== "merged" && <ActionButton action="discard" id={a.id} kind="btn-danger"><Trash2 className="h-4 w-4" />Clean up worktree</ActionButton>}
        </section>
      )}

      <section className="card">
        <h2 className="font-bold">Patch</h2>
        <div className="mt-3"><Diff diff={a.patch_diff} /></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card"><p className="eyebrow text-rose-600">Before · {original.status}</p><div className="mt-1"><TesterTag runner={original.runner} /></div>{before && <img src={before} alt="Before" className="mt-3 w-full rounded-xl border border-line" />}</div>
        <div className="card"><p className="eyebrow text-emerald-600">After · {rerun?.status ?? "not run"}</p>{rerun && <div className="mt-1"><TesterTag runner={rerun.runner} /></div>}{after ? <img src={after} alt="After" className="mt-3 w-full rounded-xl border border-line" /> : <p className="mt-3 text-sm text-mute">The retest hasn't run.</p>}</div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <details className="card"><summary className="cursor-pointer font-bold">Agent log</summary><pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-mute">{a.agent_log || "—"}</pre></details>
        <details className="card"><summary className="cursor-pointer font-bold">Unit check output</summary><pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-mute">{a.unit_log || "—"}</pre></details>
      </section>
    </div>
  );
}
