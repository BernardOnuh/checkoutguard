"use client";
// Visual pieces for the homepage: the silk "canyon" of light lines behind the hero, the glowing app tile with its
// light beam, and the small self-playing illustrations inside the How-it-works cards.
import { useEffect, useState } from "react";
import { ArrowUp, Check, FlaskConical } from "lucide-react";
import { Badge } from "@/components/logo";
import { useInView } from "./motion";

/** Two walls of fine light lines rising from a valley floor, drifting slowly. */
export function SilkCanyon() {
  const W = 1600, H = 900, cx = W / 2;
  const N = 90;
  const lines = Array.from({ length: N }, (_, i) => {
    const w = 190 + i * 5.2, A = 760 - i * 5.6, base = 700 + i * 2.2;
    const pts: string[] = [];
    for (let x = -40; x <= W + 40; x += 20) {
      const d = (x - cx) / w, y = base - A * (1 - Math.exp(-d * d)) + Math.sin(x / 140 + i * 0.35) * 6;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return { d: `M${pts.join(" L")}`, o: 0.12 + 0.6 * Math.pow(1 - i / N, 1.3) };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="silk" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset="0.3" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.42" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.02" /><stop offset="0.58" stopColor="#fff" stopOpacity="0.12" /><stop offset="0.7" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="floor" cx="0.5" cy="0.82" r="0.42"><stop offset="0" stopColor="#fff" stopOpacity="0.24" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#floor)" />
      <g className="silk-drift">{lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke="url(#silk)" strokeOpacity={l.o} strokeWidth={1.1} />)}</g>
    </svg>
  );
}

/** The CheckoutGuard badge glowing on the valley floor, with a beam of light under it. */
export function BeaconTile() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="pointer-events-none absolute -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      <Badge className="relative h-36 w-36 drop-shadow-[0_0_40px_rgb(255_255_255/0.45)] sm:h-40 sm:w-40" />
      <div className="beam h-40 w-16" />
      <div className="-mt-6 h-6 w-72 rounded-[50%] bg-white/25 blur-xl" />
    </div>
  );
}

/** Card visual 1: a glowing orb with Kane's flask, pulsing as it "runs". */
export function OrbVisual() {
  return (
    <div className="relative grid h-full place-items-center">
      <div className="orb-pulse absolute h-36 w-36 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgb(255_255_255/0.35),rgb(255_255_255/0.04)_60%,transparent_70%)] shadow-[0_0_60px_-10px_rgb(255_255_255/0.35)] ring-1 ring-white/10" />
      <div className="relative grid h-14 w-14 place-items-center rounded-full bg-neutral-900 ring-1 ring-white/25 shadow-[0_0_30px_-4px_rgb(255_255_255/0.5)]"><FlaskConical className="h-6 w-6 text-white" /></div>
    </div>
  );
}

/** Card visual 2: the journeys Kane ran, with the failing one lit up in turn. */
export function ListVisual() {
  const rows = ["Add to cart", "Cart subtotal", "Apply coupon", "Checkout", "Order confirmation"];
  const bad = [1, 2, 4];
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [k, setK] = useState(0);
  useEffect(() => { if (!inView) return; const t = setInterval(() => setK(n => (n + 1) % bad.length), 1600); return () => clearInterval(t); }, [inView]);
  return (
    <div ref={ref} className="space-y-0.5 px-1">
      {rows.map((r, i) => {
        const on = bad[k] === i, failing = bad.includes(i);
        return (
          <div key={r} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-500 ${on ? "bg-white/15 text-white shadow-[0_0_30px_-8px_rgb(255_255_255/0.5)] ring-1 ring-white/25" : "text-neutral-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${failing ? "bg-white" : "bg-neutral-600"}`} />{r}
            {on && <span className="ml-auto font-mono text-[10px] text-neutral-300">evidence →</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Card visual 3: a Kane objective typed into a command box, sparkles around it. */
export function CommandVisual() {
  const text = "Assert that the Subtotal is $54.00.";
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [n, setN] = useState(0);
  useEffect(() => { if (!inView) return; const t = setInterval(() => setN(v => (v >= text.length + 18 ? 0 : v + 1)), 70); return () => clearInterval(t); }, [inView]);
  return (
    <div ref={ref} className="relative flex h-full flex-col justify-end">
      <div className="pointer-events-none absolute inset-0">{Array.from({ length: 26 }, (_, i) => (
        <span key={i} className="twinkle absolute h-[2px] w-[2px] rounded-full bg-white" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 67) % 80}%`, animationDelay: `${(i * 0.37) % 3}s` }} />
      ))}</div>
      <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center">
        <div className="cube"><span /><span /><span /></div>
      </div>
      <div className="relative flex items-center gap-2 rounded-2xl bg-neutral-900/90 px-4 py-3 ring-1 ring-white/15">
        <span className="truncate font-mono text-[12px] text-neutral-300">{text.slice(0, Math.min(n, text.length)) || "Give Kane an objective…"}<span className="caret">|</span></span>
        <span className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-black"><ArrowUp className="h-4 w-4" /></span>
      </div>
    </div>
  );
}

/** Card visual 4: a terminal showing Kane's rerun verdict. */
export function TerminalVisual() {
  return (
    <div className="relative h-full overflow-hidden rounded-xl bg-black/70 p-4 font-mono text-[11px] leading-relaxed text-neutral-300 ring-1 ring-white/15">
      <div className="mb-3 flex gap-1.5"><span className="h-2 w-2 rounded-full bg-white/40" /><span className="h-2 w-2 rounded-full bg-white/25" /><span className="h-2 w-2 rounded-full bg-white/15" /></div>
      <div className="text-neutral-500">$ kane-cli run --agent …</div>
      <div>{"{"} <span className="text-white">"type"</span>: "run_end",</div>
      <div>&nbsp;&nbsp;<span className="text-white">"status"</span>: "passed",</div>
      <div>&nbsp;&nbsp;<span className="text-white">"one_liner"</span>: "updated the Ceramic</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;Mug quantity on the cart page" {"}"}</div>
      <div className="mt-3 flex items-center gap-1.5 text-white"><Check className="h-3.5 w-3.5" />verified · waiting for approval</div>
    </div>
  );
}
