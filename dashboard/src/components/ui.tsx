import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, ShieldCheck, ShieldX, XCircle } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  passed: { label: "Passing", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25", Icon: CheckCircle2 },
  failed: { label: "Failing", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/25", Icon: XCircle },
  error: { label: "Error", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/25", Icon: AlertTriangle },
  running: { label: "Running", cls: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/25", Icon: Loader2 },
  verified: { label: "Verified", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25", Icon: ShieldCheck },
  merged: { label: "Merged", cls: "bg-violet-400/10 text-violet-300 ring-violet-400/25", Icon: ShieldCheck },
  retest_failed: { label: "Retest failed", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/25", Icon: ShieldX },
  unit_failed: { label: "Unit checks failed", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/25", Icon: ShieldX },
  agent_failed: { label: "Agent failed", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/25", Icon: AlertTriangle },
  rejected: { label: "Rejected", cls: "bg-white/5 text-mute ring-white/10", Icon: XCircle },
  none: { label: "Not run", cls: "bg-white/5 text-mute ring-white/10", Icon: CircleDashed },
};

export function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-white/5 text-mute ring-white/10", Icon: CircleDashed };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.cls}`}>
      <s.Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />{s.label}
    </span>
  );
}

/** Which tester produced a run. Stand-in runs are labelled so they're never mistaken for Kane evidence. */
export function TesterTag({ runner }: { runner: string }) {
  return runner === "kane"
    ? <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-500 to-indigo-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Kane CLI</span>
    : <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/25" title="Stand-in check used until Kane CLI is set up. Not Kane evidence.">Local check</span>;
}

export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export const evidenceUrl = (path?: string | null) => (path ? `/api/evidence?path=${encodeURIComponent(path)}` : null);

/** A screenshot framed as a browser window. */
export function BrowserShot({ src, url = "northwind.test", tone = "neutral" }: { src: string | null; url?: string; tone?: "neutral" | "fail" | "pass" }) {
  const ring = tone === "fail" ? "ring-rose-400/30" : tone === "pass" ? "ring-emerald-400/30" : "ring-white/10";
  return (
    <div className={`overflow-hidden rounded-xl bg-[#11162a] ring-1 ${ring}`}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400/70" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300/70" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" /></span>
        <span className="mono ml-2 flex-1 truncate rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-mute">{url}</span>
      </div>
      {src ? <img src={src} alt="Screenshot of the store" className="w-full" /> : <p className="p-8 text-center text-sm text-mute">No screenshot</p>}
    </div>
  );
}

/** A unified diff with added and removed lines coloured. */
export function Diff({ diff }: { diff: string }) {
  if (!diff.trim()) return <p className="text-sm text-mute">No changes.</p>;
  const lines = diff.split("\n");
  const adds = lines.filter(l => l.startsWith("+") && !l.startsWith("+++")).length;
  const dels = lines.filter(l => l.startsWith("-") && !l.startsWith("---")).length;
  const file = lines.find(l => l.startsWith("+++"))?.replace("+++ b/", "") ?? "";
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
      <div className="flex items-center justify-between bg-white/[0.04] px-4 py-2 text-xs">
        <span className="mono text-ink">{file}</span>
        <span className="mono"><b className="text-emerald-300">+{adds}</b> <b className="text-rose-300">−{dels}</b></span>
      </div>
      <pre className="overflow-x-auto bg-[#05070e] py-3 font-mono text-[12.5px] leading-relaxed text-slate-400">
        {lines.filter(l => !/^(diff |index |--- |\+\+\+ )/.test(l)).map((l, i) => {
          const cls = l.startsWith("+") ? "bg-emerald-400/10 text-emerald-200" : l.startsWith("-") ? "bg-rose-400/10 text-rose-200" : l.startsWith("@@") ? "text-cyan-300/80" : "";
          return <div key={i} className={`px-4 ${cls}`}><span className="mr-3 inline-block w-3 select-none opacity-60">{l.startsWith("+") ? "+" : l.startsWith("-") ? "−" : ""}</span>{l.replace(/^[+-]/, "") || " "}</div>;
        })}
      </pre>
    </div>
  );
}

/** Detected → Patched → Verified → Merged, for a journey's latest repair. */
export function Pipeline({ stage, failedAt }: { stage: number; failedAt?: number }) {
  const steps = ["Detected", "Patched", "Verified", "Merged"];
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const done = i <= stage && failedAt !== i;
        const bad = failedAt === i;
        return (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={`h-1 rounded-full ${bad ? "bg-rose-400" : done ? (i === 0 ? "bg-rose-400/70" : "bg-gradient-to-r from-violet-400 to-cyan-300") : "bg-white/10"}`} />
            <span className={`text-[10px] font-medium ${bad ? "text-rose-300" : done ? "text-ink" : "text-mute/70"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
