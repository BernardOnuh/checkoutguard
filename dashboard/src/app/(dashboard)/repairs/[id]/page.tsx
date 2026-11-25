import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Download, CheckCircle2, CircleDashed, FlaskConical, GitMerge, PlayCircle, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { runner } from "@/lib/runner";
import { ActionButton, LiveRefresh } from "@/components/actions";
import { BrowserShot, Diff, Pill, TesterTag, evidenceUrl, when } from "@/components/ui";

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
  // "rejected" means either the scope check threw the patch out, or a person discarded a verified repair.
  const discarded = s === "rejected" && rerun?.status === "passed";
  const stages: Stage[] = [
    { label: "Checkout test failed", state: "done", detail: `${failure.step}: expected ${failure.expected}, got ${failure.actual}`, Icon: XCircle },
    { label: "Agent patched the code in an isolated worktree", state: s === "agent_failed" || (s === "rejected" && !discarded) ? "failed" : agentDone ? "done" : "running", detail: s === "rejected" && !discarded ? "Patch touched files outside store/src/ and was rejected." : s === "agent_failed" ? "No usable patch." : a.branch, Icon: Bot },
    { label: "Unit checks", state: s === "unit_failed" ? "failed" : ["verified", "retest_failed", "merged"].includes(s) || discarded || rerun ? "done" : s === "running" && agentDone ? "running" : "waiting", detail: a.unit_log.split("\n").slice(0, 3).join(" · "), Icon: FlaskConical },
    { label: "Same journey rerun", state: s === "retest_failed" ? "failed" : rerun?.status === "passed" ? "done" : rerun?.status === "running" ? "running" : "waiting", detail: rerun ? `${rerun.status} · ${rerun.runner === "kane" ? "Kane CLI" : "local check"}` : undefined, Icon: PlayCircle },
    { label: s === "merged" ? "Merged after approval" : discarded ? "Verified, then discarded" : "Verdict", state: s === "verified" || s === "merged" || discarded ? "done" : ["unit_failed", "retest_failed", "agent_failed", "rejected"].includes(s) ? "failed" : "waiting", detail: s === "verified" ? "Verified: the original failure is resolved. Waiting for your approval." : discarded ? "Kane's rerun passed. A person discarded the patch instead of merging it." : s === "merged" ? `Merged into the main branch.` : undefined, Icon: ShieldCheck },
  ];
  const before = evidenceUrl(original.steps && JSON.parse(original.steps).find((x: { evidence?: string }) => x.evidence)?.evidence);
  const after = rerun ? evidenceUrl(JSON.parse(rerun.steps).find((x: { evidence?: string }) => x.evidence)?.evidence) : null;

  return (
    <div className="space-y-6">
      <LiveRefresh active={s === "running"} />
      <Link href={`/runs/${original.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-mute transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Failed run</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="pill">Repair record · attempt {a.attempt} of {runner.maxAttempts}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{sc?.title ?? original.scenario}</h1>
          <p className="mono mt-1 text-mute">{a.branch} · started {when(a.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          {s !== "running" && <a href={`/api/report?id=${a.id}`} className="btn-ghost !py-1.5 text-xs"><Download className="h-3.5 w-3.5" />Report</a>}
          <Pill status={discarded ? "discarded" : s} />
        </div>
      </div>

      <section className="card">
        <ol className="relative">
          {stages.map((st, i) => {
            const color = st.state === "failed" || (i === 0 && st.state === "done") ? "bad" : st.state === "done" ? "good" : st.state === "running" ? "live" : "idle";
            return (
              <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                {i < stages.length - 1 && <span className={`absolute left-[17px] top-10 h-[calc(100%-2.75rem)] w-px ${st.state === "done" ? "bg-gradient-to-b from-white/70 to-white/10" : "bg-white/10"}`} />}
                <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${color === "bad" ? "bg-black text-neutral-300 ring-0 border border-dashed border-white/50" : color === "good" ? "bg-white text-black ring-white" : color === "live" ? "bg-white/15 text-white ring-white/50 shadow-[0_0_20px_-2px_rgb(255_255_255/0.6)]" : "bg-white/5 text-mute ring-white/10"}`}>
                  {st.state === "waiting" ? <CircleDashed className="h-4 w-4" /> : st.state === "running" ? <st.Icon className="h-4 w-4 animate-pulse" /> : color === "bad" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </span>
                <div className="min-w-0 pt-1.5">
                  <p className={`font-medium ${st.state === "waiting" ? "text-mute" : ""}`}>{st.label}</p>
                  {st.detail && <p className="mono mt-1 break-words leading-relaxed text-mute">{st.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {s === "verified" && (
        <section className="card flex flex-wrap items-center justify-between gap-4 !border-white/40 shadow-[0_0_60px_-24px_rgb(255_255_255/0.7)]">
          <div>
            <p className="flex items-center gap-2 font-semibold text-white"><ShieldCheck className="h-4 w-4" />Verified by a second run of the same journey.</p>
            <p className="mt-0.5 text-sm text-mute">Review the diff below. Nothing is merged until you approve it.</p>
          </div>
          <div className="flex gap-2">
            <ActionButton action="discard" id={a.id} kind="btn-danger" confirm="Discard this repair? Its record stays, the branch is deleted."><Trash2 className="h-4 w-4" />Discard</ActionButton>
            <ActionButton action="approve" id={a.id} kind="btn-success" confirm={`Merge ${a.branch} into the main branch?`}><GitMerge className="h-4 w-4" />Approve and merge</ActionButton>
          </div>
        </section>
      )}
      {discarded && (
        <section className="card flex flex-wrap items-center gap-3 !border-white/25 text-sm text-neutral-300">
          <ShieldCheck className="h-4 w-4 text-white" /><p><b className="text-white">Verified, not merged.</b> Kane's rerun passed, and a person chose to discard the patch. Nothing was merged.</p>
        </section>
      )}
      {["unit_failed", "retest_failed", "agent_failed", "rejected"].includes(s) && !discarded && (
        <section className="card flex flex-wrap items-center justify-between gap-4 !border-dashed !border-white/30">
          <p className="text-sm text-neutral-300"><b className="text-white">Not verified.</b> A failed retest stays a failure. {failure && runner.attemptsOf(failure.id).length < runner.maxAttempts ? "You can start another attempt from the failed run." : "The attempt limit is reached."}</p>
          {s !== "merged" && <ActionButton action="discard" id={a.id} kind="btn-danger"><Trash2 className="h-4 w-4" />Clean up worktree</ActionButton>}
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">Patch</h2>
        <div className="mt-3"><Diff diff={a.patch_diff} /></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div className="flex items-center justify-between"><p className="eyebrow text-neutral-400">Before · {original.status}</p><TesterTag runner={original.runner} /></div>
          <BrowserShot src={before} tone="fail" url={`northwind.test · ${original.scenario}`} />
        </div>
        <div className="card space-y-3">
          <div className="flex items-center justify-between"><p className="eyebrow text-white">After · {rerun?.status ?? "not run"}</p>{rerun && <TesterTag runner={rerun.runner} />}</div>
          {after ? <BrowserShot src={after} tone={rerun?.status === "passed" ? "pass" : "fail"} url={`worktree · ${a.branch}`} /> : <p className="rounded-xl bg-white/[0.03] p-10 text-center text-sm text-mute ring-1 ring-white/10">The retest hasn't run.</p>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <details className="card"><summary className="cursor-pointer font-semibold">Agent log</summary><pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-mute">{a.agent_log || "—"}</pre></details>
        <details className="card"><summary className="cursor-pointer font-semibold">Unit check output</summary><pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-mute">{a.unit_log || "—"}</pre></details>
      </section>
    </div>
  );
}
