import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, ShieldCheck, ShieldX, XCircle } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  passed: { label: "Passed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: XCircle },
  error: { label: "Error", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: AlertTriangle },
  running: { label: "Running", cls: "bg-sky-50 text-sky-700 ring-sky-200", Icon: Loader2 },
  verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: ShieldCheck },
  merged: { label: "Merged", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", Icon: ShieldCheck },
  retest_failed: { label: "Retest failed", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: ShieldX },
  unit_failed: { label: "Unit checks failed", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: ShieldX },
  agent_failed: { label: "Agent failed", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: AlertTriangle },
  rejected: { label: "Rejected", cls: "bg-zinc-100 text-zinc-700 ring-zinc-200", Icon: XCircle },
  none: { label: "Not run", cls: "bg-zinc-100 text-zinc-600 ring-zinc-200", Icon: CircleDashed },
};

export function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-700 ring-zinc-200", Icon: CircleDashed };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.cls}`}>
      <s.Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />{s.label}
    </span>
  );
}

/** Which tester produced a run. Stand-in runs are labelled so they're never mistaken for Kane evidence. */
export function TesterTag({ runner }: { runner: string }) {
  return runner === "kane"
    ? <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Kane CLI</span>
    : <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800" title="Stand-in check used until Kane CLI is set up. Not Kane evidence.">Local check</span>;
}

export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");

export const evidenceUrl = (path?: string | null) => (path ? `/api/evidence?path=${encodeURIComponent(path)}` : null);

/** A unified diff with added and removed lines coloured. */
export function Diff({ diff }: { diff: string }) {
  if (!diff.trim()) return <p className="text-sm text-mute">No changes.</p>;
  return (
    <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
      {diff.split("\n").map((l, i) => {
        const cls = l.startsWith("+++") || l.startsWith("---") ? "text-slate-500" : l.startsWith("+") ? "bg-emerald-500/15 text-emerald-300" : l.startsWith("-") ? "bg-rose-500/15 text-rose-300" : l.startsWith("@@") ? "text-sky-400" : l.startsWith("diff ") || l.startsWith("index ") ? "text-slate-500" : "";
        return <div key={i} className={`-mx-4 px-4 ${cls}`}>{l || " "}</div>;
      })}
    </pre>
  );
}
