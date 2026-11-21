// Downloads a repair's self-contained HTML report (safe to share: a static file, nothing of the runner).
import { readFileSync } from "node:fs";
import { isLocal } from "@/lib/local-only";
// The runner is plain JavaScript (ES modules) next to the dashboard.
import { buildReport } from "../../../../../runner/src/report.js";

export async function GET(req: Request) {
  if (!isLocal(req)) return new Response("Forbidden", { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  try {
    const file = buildReport(id);
    return new Response(readFileSync(file), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="checkoutguard-${id}.html"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 404 });
  }
}
