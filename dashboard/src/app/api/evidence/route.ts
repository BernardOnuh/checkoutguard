// Serves evidence files (screenshots, logs) from the runner's data folder, and nothing outside it.
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { runner } from "@/lib/runner";
import { isLocal } from "@/lib/local-only";

export async function GET(req: Request) {
  if (!isLocal(req)) return new Response("Forbidden", { status: 403 });
  const p = new URL(req.url).searchParams.get("path") || "";
  const full = resolve(p);
  if (!full.startsWith(resolve(runner.dataDir) + "/") || !existsSync(full)) return new Response("Not found", { status: 404 });
  const type = { ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".log": "text/plain; charset=utf-8", ".json": "application/json" }[extname(full)] || "application/octet-stream";
  return new Response(readFileSync(full), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}
