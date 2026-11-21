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
      <Link href={`/runs/${original.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-mute transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Failed run</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-violet-300">Repair record · attempt {a.attempt} of {runner.maxAttempts}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{sc?.title ?? original.scenario}</h1>
          <p className="mono mt-1 text-mute">{a.branch} · started {when(a.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          {s !== "running" && <a href={`/api/report?id=${a.id}`} className="btn-ghost !py-1.5 text-xs"><Download className="h-3.5 w-3.5" />Report</a>}
          <Pill status={s} />
        </div>
      </div>

      <section className="card">
        <ol className="relative">
          {stages.map((st, i) => {
            const color = st.state === "failed" || (i === 0 && st.state === "done") ? "rose" : st.state === "done" ? "emerald" : st.state === "running" ? "cyan" : "slate";
            return (
              <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                {i < stages.length - 1 && <span className={`absolute left-[17px] top-10 h-[calc(100%-2.75rem)] w-px ${st.state === "done" ? "bg-gradient-to-b from-emerald-400/60 to-white/10" : "bg-white/10"}`} />}
                <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${color === "rose" ? "bg-rose-400/15 text-rose-300 ring-rose-400/30" : color === "emerald" ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" : color === "cyan" ? "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30 shadow-[0_0_20px_-2px_rgb(34_211_238/0.6)]" : "bg-white/5 text-mute ring-white/10"}`}>
                  {st.state === "waiting" ? <CircleDashed className="h-4 w-4" /> : st.state === "running" ? <st.Icon className="h-4 w-4 animate-pulse" /> : color === "rose" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
        <section className="card flex flex-wrap items-center justify-between gap-4 !border-emerald-400/25 !bg-emerald-400/[0.06]">
          <div>
            <p className="font-semibold text-emerald-200">Verified by a second run of the same journey.</p>
            <p className="mt-0.5 text-sm text-emerald-100/70">Review the diff below. Nothing is merged until you approve it.</p>
          </div>
          <div className="flex gap-2">
            <ActionButton action="discard" id={a.id} kind="btn-danger" confirm="Discard this repair? Its record stays, the branch is deleted."><Trash2 className="h-4 w-4" />Discard</ActionButton>
            <ActionButton action="approve" id={a.id} kind="btn-success" confirm={`Merge ${a.branch} into the main branch?`}><GitMerge className="h-4 w-4" />Approve and merge</ActionButton>
          </div>
        </section>
      )}
      {["unit_failed", "retest_failed", "agent_failed", "rejected"].includes(s) && (
        <section className="card flex flex-wrap items-center justify-between gap-4 !border-rose-400/25 !bg-rose-400/[0.06]">
          <p className="text-sm text-rose-100/80"><b className="text-rose-200">Not verified.</b> A failed retest stays a failure. {failure && runner.attemptsOf(failure.id).length < runner.maxAttempts ? "You can start another attempt from the failed run." : "The attempt limit is reached."}</p>
          {s !== "merged" && <ActionButton action="discard" id={a.id} kind="btn-danger"><Trash2 className="h-4 w-4" />Clean up worktree</ActionButton>}
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">Patch</h2>
        <div className="mt-3"><Diff diff={a.patch_diff} /></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div className="flex items-center justify-between"><p className="eyebrow text-rose-300">Before · {original.status}</p><TesterTag runner={original.runner} /></div>
          <BrowserShot src={before} tone="fail" url={`northwind.test · ${original.scenario}`} />
        </div>
        <div className="card space-y-3">
          <div className="flex items-center justify-between"><p className="eyebrow text-emerald-300">After · {rerun?.status ?? "not run"}</p>{rerun && <TesterTag runner={rerun.runner} />}</div>
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
