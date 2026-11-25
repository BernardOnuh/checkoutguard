"use client";
// Small motion helpers for the homepage: reveal-on-appear, a count-up number, and an "in view" hook that starts
// self-playing scenes only once they're on screen. Everything respects prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  return <div ref={ref} className={`reveal ${inView ? "reveal-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function CountUp({ to, suffix = "", ms = 1400 }: { to: number; suffix?: string; ms?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [inView, to, ms]);
  return <span ref={ref}>{n}{suffix}</span>;
}

/** A headline whose words rise in one after another. */
/** wordClassName styles each word (gradient text has to be applied per word, since the words are separate boxes). */
export function WordsIn({ text, className = "", wordClassName = "", start = 0 }: { text: string; className?: string; wordClassName?: string; start?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span className={`word-in inline-block ${wordClassName}`} style={{ animationDelay: `${start + i * 90}ms` }}>{w}&nbsp;</span>
        </span>
      ))}
    </span>
  );
}
