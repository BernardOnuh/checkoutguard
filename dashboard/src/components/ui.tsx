import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, ShieldCheck, ShieldX, XCircle } from "lucide-react";

// Black and white, like the homepage: a good outcome is solid white, a failure is a dashed outline, and anything
// else is a quiet grey. The icon and label always say which, so nothing relies on colour.
const GOOD = "border-white/60 bg-white/[0.12] text-white", BAD = "border-dashed border-white/35 bg-transparent text-neutral-300", QUIET = "border-white/10 bg-white/5 text-mute";
const STATUS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  passed: { label: "Passing", cls: GOOD, Icon: CheckCircle2 },
  failed: { label: "Failing", cls: BAD, Icon: XCircle },
  error: { label: "Error", cls: BAD, Icon: AlertTriangle },
  running: { label: "Running", cls: "border-white/30 bg-white/[0.06] text-white", Icon: Loader2 },
  verified: { label: "Verified", cls: GOOD, Icon: ShieldCheck },
  merged: { label: "Merged", cls: "border-white bg-white text-black", Icon: ShieldCheck },
  retest_failed: { label: "Retest failed", cls: BAD, Icon: ShieldX },
  unit_failed: { label: "Unit checks failed", cls: BAD, Icon: ShieldX },
  agent_failed: { label: "Agent failed", cls: BAD, Icon: AlertTriangle },
  rejected: { label: "Rejected", cls: QUIET, Icon: XCircle },
  discarded: { label: "Discarded after verifying", cls: QUIET, Icon: ShieldCheck },
  none: { label: "Not run", cls: QUIET, Icon: CircleDashed },
};

export function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: QUIET, Icon: CircleDashed };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <s.Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />{s.label}
    </span>
  );
}

/** Which tester produced a run. Stand-in runs are labelled so they're never mistaken for Kane evidence. */
export function TesterTag({ runner }: { runner: string }) {
  return runner === "kane"
    ? <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Kane CLI</span>
    : <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-300" title="Stand-in check used until Kane CLI is set up. Not Kane evidence.">Local check</span>;
}

export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export const evidenceUrl = (path?: string | null) => (path ? `/api/evidence?path=${encodeURIComponent(path)}` : null);

/** A screenshot framed as a browser window. */
export function BrowserShot({ src, url = "northwind.test", tone = "neutral" }: { src: string | null; url?: string; tone?: "neutral" | "fail" | "pass" }) {
  const ring = tone === "fail" ? "border-dashed border-white/35" : tone === "pass" ? "border-white/50" : "border-white/10";
  return (
    <div className={`overflow-hidden rounded-xl border bg-[#0b0b0b] ${ring}`}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/50" /><i className="h-2.5 w-2.5 rounded-full bg-white/30" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /></span>
        <span className="mono ml-2 flex-1 truncate rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-mute">{url}</span>
      </div>
      {src ? <img src={src} alt="Screenshot of the store" className="w-full" /> : <p className="p-8 text-center text-sm text-mute">No screenshot</p>}
    </div>
  );
}

/** A unified diff: added lines bright on a lit band, removed lines dim and struck through. */
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
        <span className="mono"><b className="text-white">+{adds}</b> <b className="text-neutral-500">−{dels}</b></span>
      </div>
      <pre className="overflow-x-auto bg-black py-3 font-mono text-[12.5px] leading-relaxed text-neutral-500">
        {lines.filter(l => !/^(diff |index |--- |\+\+\+ )/.test(l)).map((l, i) => {
          const cls = l.startsWith("+") ? "bg-white/[0.1] text-white" : l.startsWith("-") ? "bg-white/[0.03] text-neutral-500 line-through decoration-white/25" : l.startsWith("@@") ? "text-neutral-400" : "";
          return <div key={i} className={`px-4 ${cls}`}><span className="mr-3 inline-block w-3 select-none opacity-60">{l.startsWith("+") ? "+" : l.startsWith("-") ? "−" : ""}</span>{l.replace(/^[+-]/, "") || " "}</div>;
        })}
      </pre>
    </div>
  );
}

/** Kane found it → agent patched → Kane verified → you merged, for a journey's latest repair. */
export function Pipeline({ stage, failedAt }: { stage: number; failedAt?: number }) {
  const steps = ["Kane found it", "Agent patched", "Kane verified", "You merged"];
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const done = i <= stage && failedAt !== i;
        const bad = failedAt === i;
        return (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={`h-1 rounded-full ${bad ? "border-t border-dashed border-white/60 bg-transparent" : done ? (i === 0 ? "bg-white/45" : "bg-gradient-to-r from-white to-neutral-400") : "bg-white/10"}`} />
            <span className={`text-[10px] font-medium ${bad ? "text-neutral-300" : done ? "text-ink" : "text-mute/70"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
