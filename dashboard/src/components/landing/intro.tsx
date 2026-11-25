"use client";
// "Watch intro": a one-minute film about CheckoutGuard, with a voiceover and captions. The voice is Lily from
// ElevenLabs when scripts/intro-voice.py has generated public/intro/, and the browser's own speech otherwise. The scenes replay the real cart repair from docs/evidence: the wrong
// subtotal, Kane's finding, the one-line fix, Kane's rerun and the human approval. First-time visitors are asked once
// whether they'd like to watch it; any "Watch intro" button opens it through the "cg:intro" event.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Check, ChevronLeft, ChevronRight, FlaskConical, GitMerge, Globe, Loader2, Lock, Pause, Play, RotateCcw, ShieldCheck, Terminal, Volume2, VolumeX, X } from "lucide-react";
import { Badge } from "@/components/logo";
import LINES from "./intro-lines.json";

type SceneProps = { t: number };

const BEATS: { label: string; line: string; Scene: (p: SceneProps) => React.ReactNode }[] = [
  { label: "", line: LINES[0], Scene: Opener },
  { label: "The problem", line: LINES[1], Scene: Cart },
  { label: "Kane tests", line: LINES[2], Scene: Kane },
  { label: "The agent fixes", line: LINES[3], Scene: Agent },
  { label: "Kane verifies", line: LINES[4], Scene: Verify },
  { label: "You approve", line: LINES[5], Scene: Approve },
  { label: "", line: LINES[6], Scene: End },
];

/** How long a beat lasts: about as long as its line takes to say, plus room for the scene to land. */
const duration = (line: string) => Math.max(5200, line.split(" ").length * 390 + 1800);
const DUR = BEATS.map(b => duration(b.line));
const SEEN = "cg-intro-seen";

/** Recorded narration, keyed by line text, from public/intro/voice.json (absent until the script has run). */
let recorded: Promise<Record<string, string>> | null = null;
const loadRecorded = () => (recorded ??= fetch("/intro/voice.json", { cache: "no-store" })
  .then(r => (r.ok ? r.json() : { lines: [] }))
  .then((m: { lines: { text: string; file: string }[] }) => Object.fromEntries(m.lines.map(l => [l.text, l.file])))
  .catch(() => ({})));

const remember = () => { try { localStorage.setItem(SEEN, "1"); } catch {} };
const seen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return true; } };

/** Opens the intro from anywhere on the page. */
export function WatchIntroButton({ className = "btn-ghost", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("cg:intro"))}>
      {children ?? <><Play className="h-3.5 w-3.5" fill="currentColor" />Watch intro</>}
    </button>
  );
}

/** Mounted once on the homepage: the first-visit prompt and the film itself. */
export function IntroHost() {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    const show = () => { setAsk(false); setOpen(true); };
    window.addEventListener("cg:intro", show);
    const t = setTimeout(() => { if (!seen()) setAsk(true); }, 1400);
    return () => { window.removeEventListener("cg:intro", show); clearTimeout(t); };
  }, []);
  return (
    <>
      {ask && !open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 backdrop-blur-[2px] sm:place-items-center">
          <div role="dialog" aria-labelledby="intro-q" className="intro-rise w-full max-w-sm rounded-3xl border border-white/15 bg-neutral-950/90 p-6 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl">
            <Badge className="h-12 w-12" />
            <h2 id="intro-q" className="mt-4 text-xl font-semibold tracking-tight">Want to see what CheckoutGuard does?</h2>
            <p className="mt-1.5 text-sm text-mute">A one-minute film with a voiceover.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-light flex-1" onClick={() => { setAsk(false); setOpen(true); }}><Play className="h-4 w-4" fill="currentColor" />Yes, show me</button>
              <button type="button" className="btn-ghost" onClick={() => { remember(); setAsk(false); }}>Skip</button>
            </div>
          </div>
        </div>
      )}
      {open && <IntroFilm onClose={() => { remember(); setOpen(false); }} />}
    </>
  );
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (const name of ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Daniel", "Karen"]) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang?.startsWith("en")) ?? null;
}

function IntroFilm({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [take, setTake] = useState(0); // bumps to restart the current beat's voice
  const spoken = useRef(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => { loadRecorded().then(setFiles); }, []);

  const go = (n: number) => { setFinished(false); setI(Math.max(0, Math.min(BEATS.length - 1, n))); setT(0); setPaused(false); setTake(k => k + 1); };
  const replay = () => go(0);

  // the clock
  useEffect(() => {
    if (paused || finished) return;
    let last = performance.now();
    const id = setInterval(() => { const now = performance.now(); setT(x => x + now - last); last = now; }, 50);
    return () => clearInterval(id);
  }, [paused, finished, i, take]);

  // the voice: one line per beat; a beat doesn't end until its line has been said (or after a safety margin)
  useEffect(() => {
    if (files === null) { spoken.current = false; return; } // wait to know whether Lily's recordings exist
    audio.current?.pause();
    if (canSpeak) window.speechSynthesis.cancel();
    if (muted || finished) { spoken.current = true; return; }
    const file = files[BEATS[i].line];
    if (file) {
      const a = new Audio(file);
      audio.current = a;
      spoken.current = false;
      a.onended = a.onerror = () => { spoken.current = true; };
      a.play().catch(() => { spoken.current = true; });
      return () => { a.onended = a.onerror = null; a.pause(); };
    }
    if (!canSpeak) { spoken.current = true; return; }
    const s = window.speechSynthesis;
    spoken.current = false;
    const u = new SpeechSynthesisUtterance(BEATS[i].line);
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = 1; u.pitch = 1;
    u.onend = u.onerror = () => { spoken.current = true; };
    s.speak(u);
    return () => { u.onend = u.onerror = null; };
  }, [i, muted, take, finished, canSpeak, files]);

  useEffect(() => {
    if (audio.current) { if (paused) audio.current.pause(); else if (!audio.current.ended) audio.current.play().catch(() => {}); }
    if (!canSpeak) return;
    if (paused) window.speechSynthesis.pause(); else window.speechSynthesis.resume();
  }, [paused, canSpeak]);

  // advance
  useEffect(() => {
    if (finished || t < DUR[i] || !(spoken.current || t > DUR[i] * 1.8)) return;
    if (i < BEATS.length - 1) { setI(i + 1); setT(0); } else setFinished(true);
  }, [t, i, finished]);

  // keys, scroll lock, and silence on close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key.toLowerCase() === "m") setMuted(m => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; audio.current?.pause(); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  const beat = BEATS[i];
  const shownT = finished ? DUR[i] * 4 : t;

  // captions: the line in sentences, each shown for its share of the beat
  const sentences = beat.line.split(/(?<=[.!?])\s+/);
  const total = beat.line.length;
  let acc = 0, cap = 0;
  sentences.forEach((s, k) => { if (shownT >= (acc / total) * (DUR[i] - 1200)) cap = k; acc += s.length + 1; });

  return (
    <div role="dialog" aria-modal="true" aria-label="Introduction to CheckoutGuard" className="intro-fade fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(255_255_255/0.08),transparent)]" />

      <header className="relative z-10 flex items-center gap-4 px-4 pt-4 sm:px-6">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {BEATS.map((_, k) => (
            <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
              <i className="block h-full origin-left bg-white" style={{ transform: `scaleX(${finished || k < i ? 1 : k === i ? Math.min(1, t / DUR[i]) : 0})` }} />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Replay" onClick={replay}><RotateCcw className="h-[18px] w-[18px]" /></IconBtn>
          <IconBtn label={paused ? "Play" : "Pause"} onClick={() => setPaused(p => !p)} disabled={finished}>{paused ? <Play className="h-[18px] w-[18px]" /> : <Pause className="h-[18px] w-[18px]" />}</IconBtn>
          {canSpeak && <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(m => !m)}>{muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</IconBtn>}
          <IconBtn label="Close" onClick={onClose}><X className="h-5 w-5" /></IconBtn>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 sm:px-16">
        <div key={`${i}-${take}`} className="intro-scene w-full max-w-xl">
          <beat.Scene t={shownT} />
        </div>
        {i > 0 && <ArrowBtn side="left" onClick={() => go(i - 1)} />}
        {i < BEATS.length - 1 && <ArrowBtn side="right" onClick={() => go(i + 1)} />}
      </main>

      <footer className="relative z-10 px-4 pb-8 text-center sm:pb-10">
        {beat.label && <p className="pill mb-4">{beat.label}</p>}
        <p key={`${i}-${cap}`} aria-live="polite" className="intro-caption mx-auto min-h-[3.5em] max-w-2xl text-lg leading-snug text-white sm:text-xl">{sentences[cap]}</p>
      </footer>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid h-10 w-10 place-items-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30">{children}</button>;
}

function ArrowBtn({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" aria-label={side === "left" ? "Previous scene" : "Next scene"} onClick={onClick}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white backdrop-blur transition hover:bg-white/10 sm:grid ${side === "left" ? "left-4" : "right-4"}`}>
      <Icon className="h-6 w-6" />
    </button>
  );
}

/** Shows its children once the scene clock passes `at`. */
function At({ t, at, className = "", children }: { t: number; at: number; className?: string; children: React.ReactNode }) {
  return <div className={`transition-all duration-700 ${t >= at ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${className}`}>{children}</div>;
}

const panel = "rounded-3xl border border-white/10 bg-gradient-to-b from-[#121212] to-[#080808] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_40px_80px_-30px_rgb(0_0_0/0.9)]";

/* ---------------- scenes ---------------- */

function Opener({ t }: SceneProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`transition-all duration-[1400ms] ${t > 150 ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>
        <Badge className="h-40 w-40 drop-shadow-[0_0_50px_rgb(255_255_255/0.5)] sm:h-48 sm:w-48" />
      </div>
      <div className={`beam h-24 w-14 transition-opacity duration-1000 ${t > 700 ? "opacity-100" : "opacity-0"}`} />
      <At t={t} at={1400}><h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">CheckoutGuard</h2></At>
      <At t={t} at={2200}><p className="mt-3 text-mute">Kane-tested. Agent-fixed. Human-approved.</p></At>
    </div>
  );
}

function Cart({ t }: SceneProps) {
  const wrong = t > 3400;
  return (
    <div className={`${panel} p-6`}>
      <div className="flex items-center justify-between text-xs text-mute"><span className="font-semibold text-white">Northwind Goods</span><span>Your cart</span></div>
      <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4">
        <span className="flex items-center gap-3"><span className="flex gap-1">{[0, 1, 2].map(k => <span key={k} className={`text-2xl transition-all duration-500 ${t > 400 + k * 450 ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>☕</span>)}</span><span className="text-sm">Ceramic Mug</span></span>
        <span className="font-mono text-sm text-mute">$18.00 × <b className="text-white">3</b></span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-mute">Subtotal</span>
        <span className={`rounded-lg px-2 py-0.5 font-mono text-2xl font-semibold transition-all duration-500 ${wrong ? "border border-dashed border-white/60 text-white" : "text-white"}`}>$18.00</span>
      </div>
      <At t={t} at={3900} className="mt-4 flex items-center justify-end gap-2 text-sm text-neutral-300"><X className="h-4 w-4" />3 × $18.00 should be <b className="text-white">$54.00</b></At>
    </div>
  );
}

function Kane({ t }: SceneProps) {
  const cmd = "Add the Ceramic Mug to the cart. Change its quantity to 3 and click Update. Assert that the Subtotal is $54.00.";
  const typed = cmd.slice(0, Math.floor(Math.max(0, t - 300) / 28));
  const steps = ["navigate to the store", "click Add to cart", "set quantity to 3", "click Update", "read the Subtotal"];
  return (
    <div className={`${panel} p-5 font-mono text-[12.5px] leading-relaxed`}>
      <div className="mb-3 flex items-center gap-2 text-[11px] text-mute"><FlaskConical className="h-4 w-4 text-white" />Kane CLI · real browser</div>
      <p className="text-neutral-400">$ kane-cli run "<span className="text-white">{typed}</span>{typed.length < cmd.length && <span className="caret">|</span>}"</p>
      <div className="mt-3 space-y-1">
        {steps.map((s, k) => <At key={s} t={t} at={3600 + k * 380} className="flex items-center gap-2 text-neutral-300"><Check className="h-3.5 w-3.5" />{s}</At>)}
      </div>
      <At t={t} at={5800} className="mt-4 rounded-2xl border border-dashed border-white/40 p-3 font-sans">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-white"><X className="h-4 w-4" />Confirmed product bug</p>
        <p className="mt-1 text-[13px] text-neutral-300">“After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00.”</p>
      </At>
    </div>
  );
}

function Agent({ t }: SceneProps) {
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-5 w-5" />Claude Code</span>
        <span className="pill"><Lock className="h-3 w-3" />Sandboxed copy</span>
      </div>
      <p className="mt-4 font-mono text-[11px] text-mute">store/src/pricing.js</p>
      <div className="mt-2 overflow-hidden rounded-xl bg-black font-mono text-[12.5px] leading-relaxed ring-1 ring-white/10">
        <At t={t} at={600}><div className="bg-white/[0.03] px-3 py-0.5 text-neutral-500 line-through decoration-white/30">-  cents += product.priceCents;</div></At>
        <At t={t} at={1300}>
          <div className="bg-white/[0.1] px-3 py-0.5 text-white">+  cents += product.priceCents<span className={`inline-block overflow-hidden whitespace-nowrap align-bottom transition-all duration-[1400ms] ${t > 2000 ? "max-w-[12ch]" : "max-w-0"}`}>&nbsp;* line.qty</span>;</div>
        </At>
      </div>
      <At t={t} at={3600} className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 font-mono text-[11px] font-semibold text-black">edit · store/src/ only</span>
        {[{ l: "shell", I: Terminal }, { l: "web", I: Globe }, { l: "tests/", I: FlaskConical }].map(({ l, I }) => (
          <span key={l} className="flex items-center gap-1.5 rounded-full border border-dashed border-white/30 px-3 py-1 font-mono text-[11px] text-neutral-400"><I className="h-3 w-3" />{l}<Lock className="h-3 w-3" /></span>
        ))}
      </At>
    </div>
  );
}

function Verify({ t }: SceneProps) {
  const rerunning = t > 1500 && t < 3200, fixed = t >= 3200;
  return (
    <div className={`${panel} space-y-3 p-5`}>
      <At t={t} at={300} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 text-sm ring-1 ring-white/15"><Check className="h-4 w-4" />Unit checks: no regressions, 1 newly passing</At>
      <At t={t} at={1500} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 text-sm ring-1 ring-white/15">
        {rerunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}Kane reruns the same journey on the patched store
      </At>
      <At t={t} at={1500} className="flex items-center justify-between rounded-xl px-4 py-3">
        <span className="text-mute">Subtotal</span>
        <span className={`font-mono text-2xl font-semibold transition-all duration-500 ${fixed ? "text-white" : "text-neutral-500"}`}>{fixed ? "$54.00" : "$18.00"}</span>
      </At>
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 font-semibold transition-all duration-700 ${t > 3900 ? "bg-white text-black shadow-[0_0_60px_-10px_rgb(255_255_255/0.7)]" : "bg-white/[0.03] text-mute ring-1 ring-white/10"}`}>
        <ShieldCheck className="h-5 w-5" />{t > 3900 ? "Verified by Kane" : "Verdict: pending"}
      </div>
    </div>
  );
}

function Approve({ t }: SceneProps) {
  const pressed = t > 3600, merged = t > 4200;
  return (
    <div className={`${panel} relative p-5`}>
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] uppercase tracking-[0.14em] text-mute">Repair record</p><p className="mt-1 font-semibold">Cart total with several of one item</p></div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/[0.12] px-2.5 py-1 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5" />Verified</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <At t={t} at={400} className="rounded-xl border border-dashed border-white/30 p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-mute">Before</p><p className="mt-1 font-mono text-xl text-neutral-400">$18.00</p></At>
        <At t={t} at={900} className="rounded-xl border border-white/40 bg-white/[0.06] p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-mute">After</p><p className="mt-1 font-mono text-xl text-white">$54.00</p></At>
      </div>
      <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${merged ? "bg-white text-black" : pressed ? "scale-[0.97] bg-neutral-300 text-black" : "bg-white/90 text-black"}`}>
        {merged ? <><Check className="h-4 w-4" />Merged. Approved by you.</> : <><GitMerge className="h-4 w-4" />Approve and merge</>}
      </div>
      {/* a pointer drifting to the approve button */}
      <span aria-hidden="true" className="pointer-events-none absolute h-5 w-5 transition-all duration-[1600ms] ease-out" style={{ left: t > 1800 ? "52%" : "88%", top: t > 1800 ? "84%" : "30%", opacity: t > 1500 && !merged ? 1 : 0 }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 drop-shadow"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" strokeWidth="1.2" /></svg>
      </span>
    </div>
  );
}

function End({ t }: SceneProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <At t={t} at={100}><Badge className="h-24 w-24 drop-shadow-[0_0_40px_rgb(255_255_255/0.45)]" /></At>
      <At t={t} at={600}><h2 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Every checkout tested.<br /><span className="text-neutral-400">Every fix verified.</span></h2></At>
      <At t={t} at={1600} className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/app" className="btn-light !rounded-full">Open the dashboard</Link>
        <a href="https://github.com/BernardOnuh/checkoutguard" className="btn-ghost !rounded-full">View on GitHub</a>
      </At>
    </div>
  );
}
