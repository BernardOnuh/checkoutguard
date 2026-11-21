// Starts runner actions. Tests and repairs run in the background; the pages poll the run history.
import { NextResponse } from "next/server";
import { runner } from "@/lib/runner";
import { isLocal } from "@/lib/local-only";

const busy = new Set<string>();

export async function POST(req: Request) {
  if (!isLocal(req)) return NextResponse.json({ error: "Actions only work on the machine running CheckoutGuard" }, { status: 403 });
  const { action, id } = await req.json().catch(() => ({}));
  try {
    if (action === "test") {
      const ids = id === "all" ? runner.scenarios().map(s => s.id) : [String(id)];
      if (ids.some(s => !runner.scenario(s))) return NextResponse.json({ error: "Unknown scenario" }, { status: 422 });
      const key = `test:${id}`;
      if (busy.has(key)) return NextResponse.json({ error: "Already running" }, { status: 409 });
      busy.add(key);
      (async () => { try { for (const s of ids) await runner.runScenario(s); } finally { busy.delete(key); } })();
      return NextResponse.json({ started: true });
    }
    if (action === "repair") {
      const key = `repair:${id}`;
      if (busy.has(key)) return NextResponse.json({ error: "A repair for this failure is already running" }, { status: 409 });
      busy.add(key);
      // Starts the attempt; its row appears immediately with status "running".
      const done = runner.repair(String(id)).finally(() => busy.delete(key));
      const first = await Promise.race([done.then(a => ({ attempt: a })), new Promise(r => setTimeout(r, 1500)).then(() => null)]);
      return NextResponse.json({ started: true, attempt: first?.attempt ?? runner.attemptsOf(String(id)).at(-1) ?? null });
    }
    if (action === "approve") { runner.approve(String(id)); return NextResponse.json({ ok: true }); }
    if (action === "discard") { runner.discard(String(id)); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: "Unknown action" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
