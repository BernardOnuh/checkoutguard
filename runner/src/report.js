// A self-contained HTML report of one repair: the failure, the patch, the checks, the retest and the verdict,
// with screenshots embedded. Safe to share or publish: it's a static file and exposes nothing of the runner.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, db } from "./db.js";
import { scenario } from "./loop.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const img = p => (p && existsSync(p) ? `<img src="data:image/png;base64,${readFileSync(p).toString("base64")}" alt="">` : "<p class=muted>No screenshot.</p>");
const shotOf = run => JSON.parse(run.steps).find(s => s.evidence)?.evidence;
const testerLabel = r => (r === "kane" ? "Kane CLI" : "Local check (stand-in, not Kane)");

export function buildReport(attemptId) {
  const a = db.prepare("SELECT * FROM repair_attempts WHERE id = ?").get(attemptId);
  if (!a) throw new Error("No such repair");
  const f = db.prepare("SELECT * FROM failures WHERE id = ?").get(a.failure_id);
  const before = db.prepare("SELECT * FROM test_runs WHERE id = ?").get(f.run_id);
  const v = db.prepare("SELECT * FROM verifications WHERE attempt_id = ?").get(a.id);
  const after = v ? db.prepare("SELECT * FROM test_runs WHERE id = ?").get(v.rerun_id) : null;
  const sc = scenario(before.scenario);
  const verified = a.status === "verified" || a.status === "merged";
  const diff = a.patch_diff.split("\n").map(l => `<span class="${l.startsWith("+") && !l.startsWith("+++") ? "add" : l.startsWith("-") && !l.startsWith("---") ? "del" : l.startsWith("@@") ? "hunk" : ""}">${esc(l) || " "}</span>`).join("");
  const checks = run => JSON.parse(run.steps).map(s => `<li class="${s.status}"><b>${s.status === "passed" ? "✓" : "✗"} ${esc(s.name)}</b><br>expected ${esc(s.expected)} · actual ${esc(s.actual)}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CheckoutGuard repair ${esc(a.id)}</title>
<style>
 body{margin:0;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc}
 .wrap{max-width:900px;margin:0 auto;padding:32px 20px 64px} h1{margin:6px 0 4px;font-size:26px} h2{font-size:17px;margin:0 0 10px}
 .eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4338ca} .muted{color:#64748b}
 .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-top:16px}
 .verdict{padding:14px 18px;border-radius:14px;font-weight:700;margin-top:18px} .ok{background:#ecfdf5;color:#047857} .bad{background:#fef2f2;color:#b91c1c}
 pre{background:#020617;color:#cbd5e1;border-radius:12px;padding:16px;overflow:auto;font:12.5px/1.6 ui-monospace,Menlo,monospace} pre span{display:block}
 .add{background:rgba(16,185,129,.15);color:#6ee7b7} .del{background:rgba(244,63,94,.15);color:#fda4af} .hunk{color:#38bdf8}
 ul{padding:0;list-style:none;margin:0} li{padding:10px 12px;border-radius:10px;margin:6px 0;font-size:14px} li.passed{background:#ecfdf5} li.failed,li.error{background:#fef2f2}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} @media(max-width:700px){.grid{grid-template-columns:1fr}} img{width:100%;border:1px solid #e2e8f0;border-radius:10px}
 .tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:${"#fef3c7"};color:#92400e} .tag.kane{background:#4338ca;color:#fff}
</style></head><body><div class="wrap">
<p class="eyebrow">CheckoutGuard repair record</p>
<h1>${esc(sc.title)}</h1>
<p class="muted">Repair ${esc(a.id)} · attempt ${a.attempt} · branch <code>${esc(a.branch)}</code> · ${esc(a.created_at)}</p>
<div class="verdict ${verified ? "ok" : "bad"}">${verified ? `✓ Verified: the same journey passed after the patch${a.status === "merged" ? ", and a person approved the merge" : ". Waiting for human approval before merging"}.` : `✗ Not verified (${esc(a.status.replace("_", " "))}). A failed retest stays a failure.`}</div>
<div class="card"><h2>1. The failure</h2><p><span class="tag ${before.runner === "kane" ? "kane" : ""}">${testerLabel(before.runner)}</span> run ${esc(before.id)}</p>
<p><b>${esc(f.step)}</b><br>Expected <b>${esc(f.expected)}</b>, the page showed <b>${esc(f.actual)}</b>.</p><ul>${checks(before)}</ul></div>
<div class="card"><h2>2. The patch</h2><p class="muted">Made by the coding agent in an isolated git worktree. Only files under store/src/ may change.</p><pre>${diff || "No changes."}</pre></div>
<div class="card"><h2>3. Unit checks</h2><pre>${esc(a.unit_log.split("\n").slice(0, 3).join("\n")) || "Not run."}</pre></div>
<div class="card"><h2>4. The same journey, rerun</h2>${after ? `<p><span class="tag ${after.runner === "kane" ? "kane" : ""}">${testerLabel(after.runner)}</span> run ${esc(after.id)}: <b>${esc(after.status)}</b></p><ul>${checks(after)}</ul>` : "<p class=muted>Not rerun.</p>"}</div>
<div class="card"><h2>Before and after</h2><div class="grid"><div><p class="muted">Before</p>${img(shotOf(before))}</div><div><p class="muted">After</p>${after ? img(shotOf(after)) : "<p class=muted>—</p>"}</div></div></div>
<p class="muted" style="margin-top:24px">Generated by CheckoutGuard. Payments in the demo store use a fake provider; nothing was charged.</p>
</div></body></html>`;
  const dir = join(DATA_DIR, "reports");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `repair-${a.id}.html`);
  writeFileSync(file, html);
  return file;
}
