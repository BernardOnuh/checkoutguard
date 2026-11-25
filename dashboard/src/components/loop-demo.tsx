"use client";
// The homepage's hero animation: one real repair from this repo, replayed on a loop. A cart shows the wrong subtotal,
// Kane CLI confirms the bug, Claude Code types the one-line fix, the unit gate passes, Kane reruns the journey and the
// repair is verified, waiting for a person to approve. The words and the diff are from the real run in docs/evidence.
import { useEffect, useState } from "react";
import { Bot, Check, FlaskConical, ShieldCheck, UserCheck, X } from "lucide-react";

const STAGES = ["kane", "bug", "agent", "unit", "rerun", "verified"] as const;
const HOLD = [1600, 2600, 2600, 1500, 1800, 3200];

export function LoopDemo() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setTimeout(() => setI(n => (n + 1) % STAGES.length), HOLD[i]); return () => clearTimeout(t); }, [i]);
  const at = (s: (typeof STAGES)[number]) => STAGES.indexOf(s) <= i;
  const fixed = at("rerun");

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(255_255_255/0.28),transparent)] blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/90 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/70" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" />
          <span className="ml-2 font-mono text-[11px] text-mute">northwind-goods / cart</span>
          <span className="ml-auto rounded-md bg-white/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-white ring-1 ring-white/30">KANE CLI</span>
        </div>

        <div className="grid gap-4 p-5">
          {/* the cart under test */}
          <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-sm"><span>☕ Ceramic Mug</span><span className="font-mono text-mute">$18.00 × <b className="text-ink">3</b></span></div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-mute">Subtotal</span>
              <span className={`font-mono text-base font-bold transition-all duration-500 ${fixed ? "text-white" : at("bug") ? "rounded-md bg-white/[0.03] px-2 text-neutral-400 ring-1 ring-white/20 ring-dashed" : "text-ink"}`}>
                {fixed ? "$54.00" : "$18.00"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-mute">
              <FlaskConical className="h-3.5 w-3.5 text-white" />
              {i === 0 ? <span className="animate-pulse">kane-cli run --agent "…Assert that the Subtotal is $54.00."</span> : fixed ? <span>Kane reran the same journey</span> : <span>Kane ran the journey in a real browser</span>}
            </div>
          </div>

          {/* Kane's finding */}
          <Row show={at("bug")} tone="bad" icon={<X className="h-4 w-4" />} title="Kane CLI: confirmed product bug">
            “After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00.”
          </Row>

          {/* the agent's patch */}
          <Row show={at("agent")} tone="brand" icon={<Bot className="h-4 w-4" />} title="Claude Code · store/src/pricing.js · sandboxed">
            <div className="mt-1.5 overflow-hidden rounded-lg bg-black/40 font-mono text-[11.5px] leading-relaxed">
              <div className="bg-white/[0.03] px-3 text-neutral-400">-    cents += product.priceCents;</div>
              <div className="bg-white/[0.1] px-3 text-white">
                +    cents += product.priceCents<span className={`inline-block overflow-hidden whitespace-nowrap align-bottom transition-all duration-[1400ms] ${at("agent") ? "max-w-[12ch]" : "max-w-0"}`}>&nbsp;* line.qty</span>;
              </div>
            </div>
          </Row>

          <div className="grid grid-cols-2 gap-3">
            <Row show={at("unit")} tone="good" icon={<Check className="h-4 w-4" />} title="Unit gate">no regressions · 1 newly passing</Row>
            <Row show={at("rerun")} tone="good" icon={<FlaskConical className="h-4 w-4" />} title="Kane rerun">Subtotal is $54.00 ✓</Row>
          </div>

          {/* the verdict */}
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-500 ${at("verified") ? "bg-white/[0.1] text-white ring-1 ring-white/50 shadow-[0_0_40px_-10px_rgb(255_255_255/0.6)]" : "bg-white/[0.02] text-mute ring-1 ring-white/5"}`}>
            <ShieldCheck className="h-5 w-5" />
            {at("verified") ? "Verified by Kane. Waiting for your approval to merge." : "Verdict: pending"}
            {at("verified") && <UserCheck className="ml-auto h-4 w-4 text-white" />}
          </div>
        </div>

        {/* stage track */}
        <div className="flex gap-1.5 border-t border-line px-5 py-3">
          {STAGES.map((s, k) => <span key={s} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${k <= i ? (k === 1 ? "bg-white" : "bg-gradient-to-r from-white to-neutral-500") : "bg-white/10"}`} />)}
        </div>
      </div>
    </div>
  );
}

function Row({ show, tone, icon, title, children }: { show: boolean; tone: "bad" | "good" | "brand"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const ring = tone === "bad" ? "ring-white/20 ring-dashed bg-white/[0.03]" : tone === "good" ? "ring-white/50 bg-white/[0.1]" : "ring-white/30 bg-white/[0.07]";
  const ink = tone === "bad" ? "text-neutral-400" : tone === "good" ? "text-white" : "text-white";
  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 transition-all duration-500 ${ring} ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
      <div className={`flex items-center gap-2 text-[12px] font-semibold ${ink}`}>{icon}{title}</div>
      <div className="mt-1 text-[13px] leading-snug text-ink/90">{children}</div>
    </div>
  );
}
