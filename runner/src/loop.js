// The CheckoutGuard loop: test a checkout journey, turn a failure into evidence, have a coding agent patch the
// source in an isolated git worktree, run the unit checks, and rerun the same journey. A repair is "verified"
// only when the rerun passes. Nothing is merged without a person approving it.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative } from "node:path";
import { DATA_DIR, ROOT, db, newId, now } from "./db.js";
import { runLocalCheck } from "./local-check.js";
import { runKane, kaneConfigured } from "./kane.js";
import { runAgent } from "./agent.js";

export const MAX_ATTEMPTS = Number(process.env.CG_MAX_ATTEMPTS) || 2;
/** The only paths a repair may change. Tests and scenarios are off-limits so a fix can't rewrite the check. */
const ALLOWED = [/^store\/src\//];

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export const scenarios = () => readdirSync(join(ROOT, "scenarios")).filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(readFileSync(join(ROOT, "scenarios", f), "utf8")));
export const scenario = id => scenarios().find(s => s.id === id) ?? (() => { throw new Error(`Unknown scenario ${id}`); })();

export function ensureProject() {
  const p = db.prepare("SELECT * FROM projects LIMIT 1").get();
  if (p) return p;
  const id = newId("prj");
  db.prepare("INSERT INTO projects (id, name, repo_path, preview_url, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, "Northwind Goods (demo store)", ROOT, "http://127.0.0.1:4300", now());
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
}

const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => r(port)); }); });

/** Starts the store from a checkout (the repo or a repair worktree) on a free port. */
async function startStore(dir) {
  const port = await freePort();
  const proc = spawn(process.execPath, ["src/server.js"], { cwd: join(dir, "store"), env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" }, stdio: "ignore" });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(url + "/health")).ok) return { url, stop: () => proc.kill() }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error("The store didn't start");
}

/** Which tester runs journeys: Kane CLI when configured, otherwise the clearly labelled local stand-in. */
export const testerName = () => (kaneConfigured() ? "kane" : "local-check");

/** Tests one scenario against the store built from `dir`, records the run, and returns it (with its failure, if any). */
export async function runScenario(scenarioId, { dir = ROOT, target = "original" } = {}) {
  const project = ensureProject();
  const sc = scenario(scenarioId);
  const runId = newId("run");
  const runner = testerName();
  db.prepare("INSERT INTO test_runs (id, project_id, scenario, runner, target, status, started_at) VALUES (?, ?, ?, ?, ?, 'running', ?)")
    .run(runId, project.id, sc.id, runner, target, now());
  const evidenceDir = join(DATA_DIR, "evidence", runId);
  let result;
  const store = await startStore(dir);
  try {
    result = runner === "kane" ? await runKane(sc, store.url, evidenceDir) : await runLocalCheck(sc, store.url, evidenceDir);
  } catch (e) {
    result = { status: "error", steps: [{ name: "Run the journey", status: "error", expected: "journey completes", actual: e.message }], failure: null };
  } finally {
    store.stop();
  }
  db.prepare("UPDATE test_runs SET status = ?, steps = ?, log_path = ?, completed_at = ? WHERE id = ?")
    .run(result.status, JSON.stringify(result.steps), result.logPath ?? null, now(), runId);
  let failureId = null;
  if (result.failure) {
    failureId = newId("fail");
    const f = result.failure;
    db.prepare("INSERT INTO failures (id, run_id, step, expected, actual, evidence_path) VALUES (?, ?, ?, ?, ?, ?)")
      .run(failureId, runId, f.step, String(f.expected), String(f.actual), f.evidencePath ?? null);
  }
  return { runId, failureId, ...result };
}

/** The evidence handed to the coding agent: the journey, every failed check, and where the evidence is. */
function agentBrief(sc, run, failure, previous) {
  const steps = JSON.parse(run.steps);
  return [
    `# Checkout test failure: ${sc.title}`,
    "",
    `A browser test (${run.runner}) of this store's checkout failed. Fix the bug in the store's source code so the journey passes.`,
    "",
    "## The journey that was tested",
    sc.objective,
    "",
    ...sc.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## What the test saw",
    ...steps.map(s => `- [${s.status}] ${s.name}: expected ${s.expected}, actual ${s.actual}`),
    "",
    `First failing check: "${failure.step}". Expected ${failure.expected}, but the page showed ${failure.actual}.`,
    "",
    "## Rules",
    "- Change only files under store/src/. Do not touch tests, scenarios or anything else.",
    "- Make the smallest correct fix for the root cause. Don't special-case the test data.",
    "- The unit tests in store/test/ describe correct behaviour; read them, don't edit them.",
    ...(previous ? ["", "## Your previous attempt didn't verify", previous] : []),
  ].join("\n");
}

/** One repair attempt in its own worktree. Returns the attempt row. */
export async function repair(failureId, { onProgress = () => {} } = {}) {
  const failure = db.prepare("SELECT * FROM failures WHERE id = ?").get(failureId);
  if (!failure) throw new Error("No such failure");
  const run = db.prepare("SELECT * FROM test_runs WHERE id = ?").get(failure.run_id);
  const sc = scenario(run.scenario);
  const done = db.prepare("SELECT COUNT(*) AS n FROM repair_attempts WHERE failure_id = ?").get(failureId).n;
  if (done >= MAX_ATTEMPTS) throw new Error(`This failure already had ${done} repair attempts (limit ${MAX_ATTEMPTS})`);
  if (git(ROOT, "status", "--porcelain", "--", "store")) throw new Error("The store has uncommitted changes; commit or stash them first");

  const attemptNo = done + 1;
  const id = newId("fix");
  const branch = `cg/${sc.id}-${id.slice(4)}`;
  const worktree = join(ROOT, ".worktrees", id);
  mkdirSync(join(ROOT, ".worktrees"), { recursive: true });
  git(ROOT, "worktree", "add", "-q", "-b", branch, worktree, "HEAD");
  db.prepare("INSERT INTO repair_attempts (id, failure_id, attempt, branch, worktree, status, created_at) VALUES (?, ?, ?, ?, ?, 'running', ?)")
    .run(id, failureId, attemptNo, branch, worktree, now());
  const set = (fields) => {
    const keys = Object.keys(fields);
    db.prepare(`UPDATE repair_attempts SET ${keys.map(k => `${k} = ?`).join(", ")} WHERE id = ?`).run(...Object.values(fields), id);
  };

  const prev = db.prepare("SELECT * FROM repair_attempts WHERE failure_id = ? AND attempt = ?").get(failureId, attemptNo - 1);
  const previous = prev ? `It ended as "${prev.status}". Its diff was:\n\n\`\`\`diff\n${prev.patch_diff}\n\`\`\`\n\n${prev.unit_log.slice(-1500)}` : null;
  const brief = agentBrief(sc, run, failure, previous);
  writeFileSync(join(DATA_DIR, `brief-${id}.md`), brief);

  // 1. The agent edits the worktree.
  onProgress("agent");
  const agent = await runAgent({ worktree, brief, allowedDir: "store/src" });
  set({ agent_log: agent.log.slice(-20000) });
  const diff = git(worktree, "diff", "--", ".");
  const changed = git(worktree, "diff", "--name-only").split("\n").filter(Boolean);
  set({ patch_diff: diff });
  if (!agent.ok || !changed.length) return finish("agent_failed", agent.ok ? "The agent made no changes." : agent.error);
  const outside = changed.filter(f => !ALLOWED.some(re => re.test(f)));
  if (outside.length) return finish("rejected", `The patch changed files outside store/src/: ${outside.join(", ")}. Rejected without testing.`);
  git(worktree, "add", "-A", "--", "store/src");
  git(worktree, "-c", "user.name=CheckoutGuard", "-c", "user.email=checkoutguard@localhost", "commit", "-q", "-m", `CheckoutGuard repair for ${sc.id} (attempt ${attemptNo})\n\nFailure: ${failure.step}\nExpected ${failure.expected}, got ${failure.actual}`);

  // 2. Unit checks.
  onProgress("unit");
  const unit = await new Promise(r => {
    const p = spawn(process.execPath, ["--test", "test/"], { cwd: join(worktree, "store"), stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 });
    let out = ""; p.stdout.on("data", d => (out += d)); p.stderr.on("data", d => (out += d));
    p.on("close", code => r({ ok: code === 0, out }));
  });
  set({ unit_log: unit.out.slice(-20000) });
  if (!unit.ok) return finish("unit_failed");

  // 3. Rerun the same journey against the patched store.
  onProgress("retest");
  const rerun = await runScenario(sc.id, { dir: worktree, target: `repair:${id}` });
  const verdict = rerun.status === "passed" ? "verified" : "not_verified";
  db.prepare("INSERT INTO verifications (id, attempt_id, rerun_id, verdict, created_at) VALUES (?, ?, ?, ?, ?)").run(newId("ver"), id, rerun.runId, verdict, now());
  return finish(verdict === "verified" ? "verified" : "retest_failed");

  function finish(status, note) {
    if (note) set({ agent_log: (db.prepare("SELECT agent_log FROM repair_attempts WHERE id = ?").get(id).agent_log + `\n\n[CheckoutGuard] ${note}`).trim() });
    set({ status, finished_at: now() });
    return db.prepare("SELECT * FROM repair_attempts WHERE id = ?").get(id);
  }
}

/** A person approves a verified repair: merge its branch into the current branch and clean up the worktree. */
export function approve(attemptId) {
  const a = db.prepare("SELECT * FROM repair_attempts WHERE id = ?").get(attemptId);
  if (!a) throw new Error("No such repair");
  if (a.status !== "verified") throw new Error(`Only verified repairs can be merged (this one is ${a.status})`);
  git(ROOT, "-c", "user.name=CheckoutGuard", "-c", "user.email=checkoutguard@localhost", "merge", "--no-ff", "-q", "-m", `Merge verified CheckoutGuard repair ${a.branch}`, a.branch);
  removeWorktree(a);
  db.prepare("UPDATE repair_attempts SET status = 'merged', finished_at = ? WHERE id = ?").run(now(), attemptId);
}

/** Discards a repair: its worktree and branch are deleted, its record and evidence are kept. */
export function discard(attemptId) {
  const a = db.prepare("SELECT * FROM repair_attempts WHERE id = ?").get(attemptId);
  if (!a) throw new Error("No such repair");
  if (a.status === "merged") throw new Error("Already merged");
  removeWorktree(a);
  try { git(ROOT, "branch", "-D", a.branch); } catch {}
  db.prepare("UPDATE repair_attempts SET status = CASE WHEN status = 'verified' THEN 'rejected' ELSE status END, finished_at = ? WHERE id = ?").run(now(), attemptId);
}

function removeWorktree(a) {
  if (existsSync(a.worktree)) git(ROOT, "worktree", "remove", "--force", a.worktree);
}

export const relativeToRoot = p => relative(ROOT, p);
