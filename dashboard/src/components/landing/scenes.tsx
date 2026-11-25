"use client";
// The homepage's self-playing scenes: the hero stage (grid floor, particles, the tilted repair card under a Kane scan
// beam), the loop orbit, the proof cards that turn from Kane's finding to "verified", and the agent's sandbox.
import { useEffect, useState } from "react";
import { Bot, Check, FileSearch, FlaskConical, Globe, RefreshCcw, ShieldCheck, Terminal, UserCheck, X } from "lucide-react";
import { LoopDemo } from "@/components/loop-demo";
import { useInView } from "./motion";

export function HeroStage() {
  return (
    <div className="relative [perspective:1400px]">
      {/* perspective grid floor and drifting particles */}
      <div className="pointer-events-none absolute -inset-x-24 -bottom-40 h-80 grid-floor" />
      <div className="pointer-events-none absolute -inset-16">{Array.from({ length: 22 }, (_, i) => (
        <span key={i} className="particle" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.43) % 6}s`, animationDuration: `${6 + (i % 5)}s` }} />
      ))}</div>
      <div className="card-tilt relative">
        <LoopDemo />
        {/* Kane's scan beam sweeping the card */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"><div className="scan-beam" /></div>
      </div>
    </div>
  );
}

const STEPS = [
  { icon: FlaskConical, title: "Kane tests the journey", text: "A plain-English checkout objective, one assertion, a real browser. Kane decides pass or fail." },
  { icon: FileSearch, title: "The bug becomes evidence", text: "Kane's finding, diagnosis, screenshots and network log become the agent's brief." },
  { icon: Bot, title: "The agent patches, sandboxed", text: "An isolated worktree, file tools only, nothing outside the store's source." },
  { icon: Check, title: "The unit gate", text: "No regressions, and at least one failing test now passes." },
  { icon: RefreshCcw, title: "Kane reruns the journey", text: "The same objective against the patched store. Only a Kane pass means verified." },
  { icon: UserCheck, title: "A person merges", text: "Review the diff and the before and after, then approve. Nothing merges by itself." },
];

export function LoopOrbit() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [i, setI] = useState(0);
  useEffect(() => { if (!inView) return; const t = setInterval(() => setI(n => (n + 1) % STEPS.length), 2300); return () => clearInterval(t); }, [inView]);
  const R = 42; // % of the box
  const S = STEPS[i];
  return (
    <div ref={ref} className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="0.6" />
          <circle cx="50" cy="50" r={R} fill="none" stroke="url(#ring)" strokeWidth="0.9" strokeLinecap="round"
            strokeDasharray={`${(2 * Math.PI * R * (i + 1)) / STEPS.length} 999`} transform="rotate(-90 50 50)" className="transition-[stroke-dasharray] duration-700" />
        </svg>
        {STEPS.map((s, k) => {
          const a = (k / STEPS.length) * Math.PI * 2 - Math.PI / 2, on = k === i, done = k < i;
          return (
            <div key={s.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + R * Math.cos(a)}%`, top: `${50 + R * Math.sin(a)}%` }}>
              <span className={`grid h-14 w-14 place-items-center rounded-2xl ring-1 transition-all duration-500 ${on ? "scale-110 bg-gradient-to-br from-violet-500 to-cyan-400 text-white ring-white/40 shadow-[0_0_40px_-4px_rgb(139_92_246/0.9)]" : done ? "bg-violet-500/20 text-violet-200 ring-violet-400/30" : "bg-panel text-mute ring-white/10"}`}>
                <s.icon className="h-6 w-6" />
              </span>
            </div>
          );
        })}
        <div className="absolute inset-[24%] grid place-items-center rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.25),transparent)] text-center">
          <div key={i} className="fade-swap px-2">
            <div className="font-mono text-xs text-violet-300">step 0{i + 1}</div>
            <div className="mt-1 text-[15px] font-semibold leading-tight">{S.title}</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {STEPS.map((s, k) => (
          <button key={s.title} onClick={() => setI(k)} className={`flex w-full items-start gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-500 ${k === i ? "bg-white/[0.05] ring-1 ring-violet-400/30" : "opacity-55 hover:opacity-90"}`}>
            <span className={`mt-0.5 font-mono text-xs ${k === i ? "text-cyan-300" : "text-mute"}`}>0{k + 1}</span>
            <span><span className="block font-semibold">{s.title}</span>{k === i && <span className="fade-swap mt-1 block text-sm leading-relaxed text-mute">{s.text}</span>}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProofCard({ bug, kane, fix, file, order }: { bug: string; kane: string; fix: string; file: string; order: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const [stage, setStage] = useState(0); // 0 waiting, 1 Kane found it, 2 patched, 3 verified
  useEffect(() => {
    if (!inView) return;
    const base = order * 900, ts = [setTimeout(() => setStage(1), base + 200), setTimeout(() => setStage(2), base + 1700), setTimeout(() => setStage(3), base + 2900)];
    return () => ts.forEach(clearTimeout);
  }, [inView, order]);
  return (
    <div ref={ref} className={`card relative flex flex-col overflow-hidden transition-shadow duration-700 ${stage === 3 ? "shadow-[0_0_60px_-20px_rgb(52_211_153/0.7)] ring-1 ring-emerald-400/30" : stage >= 1 ? "ring-1 ring-rose-400/20" : ""}`}>
      <div className="text-[15px] font-semibold">{bug}</div>
      <div className={`mt-4 rounded-xl p-3 ring-1 transition-all duration-700 ${stage >= 1 ? "bg-rose-500/[0.08] ring-rose-400/30 opacity-100" : "opacity-30 ring-white/10"}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300"><FlaskConical className="h-3.5 w-3.5" />Kane CLI found</div>
        <p className="mt-1.5 text-[13px] leading-snug text-ink/90">“{kane}”</p>
      </div>
      <div className={`mt-3 flex items-start gap-2 text-[13px] text-mute transition-opacity duration-700 ${stage >= 2 ? "opacity-100" : "opacity-20"}`}><Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />Fix: <span className="font-mono text-[12px] text-ink/90">{fix}</span></div>
      <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-700 ${stage === 3 ? "bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-400/40" : "text-mute ring-1 ring-white/5"}`}>
        <ShieldCheck className="h-4 w-4" />{stage === 3 ? "Verified: Kane's rerun passed" : "Kane rerun: pending"}
      </div>
      <a href={`/evidence/${file}.html`} className="btn-ghost mt-5 !py-2 text-xs">Open the repair record →</a>
    </div>
  );
}

export function Sandbox() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[480px]">
      <div className="absolute inset-[12%] rounded-[40%] bg-[radial-gradient(closest-side,rgb(251_191_36/0.12),transparent)]" />
      <div className="shield-ring absolute inset-[14%] rounded-[38%] border-2 border-amber-300/40" />
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center gap-2 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_40px_-6px_rgb(139_92_246/0.9)]"><Bot className="h-8 w-8 text-white" /></span>
        <span className="font-mono text-[11px] text-amber-200/90">edit · store/src/ only</span>
      </div>
      {[{ label: "shell", Icon: Terminal, cls: "bounce-l left-[0%] top-[22%]" }, { label: "web", Icon: Globe, cls: "bounce-r right-[0%] top-[22%]" }, { label: "tests/", Icon: X, cls: "bounce-b bottom-[2%] left-1/2 -translate-x-1/2" }].map(({ label, Icon, cls }) => (
        <span key={label} className={`absolute flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 font-mono text-xs text-rose-200 ring-1 ring-rose-400/40 ${cls}`}><Icon className="h-3.5 w-3.5" />{label} <X className="h-3 w-3" /></span>
      ))}
    </div>
  );
}
