"use client";
// Buttons that start runner actions, and a refresher that keeps pages live while something is running.
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function ActionButton({ action, id, children, kind = "btn-primary", confirm: ask, openRepair }: { action: string; id: string; children: ReactNode; kind?: string; confirm?: string; openRepair?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setError("");
    const res = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error || "Failed");
    // After starting a repair, jump to its record so the timeline can be watched live.
    const attemptId = openRepair ? (body.attempt as { id?: string } | null)?.id : null;
    if (attemptId) router.push(`/repairs/${attemptId}`); else router.refresh();
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button className={kind} onClick={go} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>
      {error && <span className="max-w-xs text-xs text-rose-700">{error}</span>}
    </span>
  );
}

/** Refreshes the page every 2 seconds while `active` is true (e.g. a test or repair is running). */
export function LiveRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
