// Kane CLI adapter. Each scenario's `kane` objective (the journey in plain English, ending in one assertion) runs with
// `kane-cli run --agent`, which drives a real Chrome and prints NDJSON. The final `run_end` event says what happened:
//   passed                                   → the journey passed
//   failed + reason_code assertion_error.*   → Kane caught a product bug: its diagnosis becomes the failure evidence
//   failed + anything else (agent_error.*)   → Kane couldn't finish the journey: an error, never sent for repair
// The NDJSON stream, Kane's evidence pack (screenshots per step, logs, network HAR) and its diagnosis are kept with
// the run. Kane decides pass or fail; CheckoutGuard never overrides its verdict.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TIMEOUT_S = Number(process.env.CG_KANE_TIMEOUT_S) || 300;

/** Kane is the tester whenever kane-cli is installed (CG_TESTER=local forces the stand-in check). */
export const kaneConfigured = () => {
  if (process.env.CG_TESTER === "local") return false;
  if (process.env.CG_TESTER === "kane") return true;
  return spawnSync("kane-cli", ["--version"], { stdio: "ignore" }).status === 0;
};

/** Kane sometimes fails for its own reasons (a browser crash, an agent stall). Those aren't verdicts about the store,
 *  so they get one more try; a confirmed product bug or a pass is never retried. */
export async function runKane(scenario, baseUrl, evidenceDir) {
  const first = await runKaneOnce(scenario, baseUrl, evidenceDir);
  if (first.status !== "error") return first;
  const second = await runKaneOnce(scenario, baseUrl, join(evidenceDir, "retry"));
  second.steps.unshift({ name: "Kane: first attempt", status: "error", expected: "a Kane verdict", actual: first.steps.at(-1)?.actual ?? "no verdict", evidence: null });
  return second;
}

async function runKaneOnce(scenario, baseUrl, evidenceDir) {
  mkdirSync(evidenceDir, { recursive: true });
  const objective = scenario.kane || scenario.objective;
  const args = ["run", objective, "--url", baseUrl, "--headless", "--agent", "--timeout", String(TIMEOUT_S), "--max-steps", "30", "--assertion-mode", "visual"];
  const { stdout, stderr } = await new Promise(resolve => {
    const p = spawn("kane-cli", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    p.stdout.on("data", d => (stdout += d)); p.stderr.on("data", d => (stderr += d));
    p.on("error", e => resolve({ stdout, stderr: stderr + `\nkane-cli couldn't start: ${e.message}` }));
    p.on("close", () => resolve({ stdout, stderr }));
  });
  const logPath = join(evidenceDir, "kane.ndjson");
  writeFileSync(logPath, stdout); writeFileSync(join(evidenceDir, "kane.stderr.log"), stderr);

  const events = stdout.split("\n").filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
  const end = events.find(e => e.type === "run_end");
  const done = events.filter(e => e.status === "done" && e.remark).map(e => e.remark);
  const steps = done.map(r => ({ name: `Kane: ${r}`, status: "passed", expected: "step completes", actual: "done", evidence: null }));

  // Kane's evidence pack: unpack it next to the run and use the last step's screenshot as the failure evidence
  const pack = events.find(e => e.type === "coverage")?.pack || stderr.match(/evidence serve (\S+\.evidence)/)?.[1];
  let screenshot = null;
  if (pack && existsSync(pack)) {
    const into = join(evidenceDir, "kane-evidence");
    try { mkdirSync(into, { recursive: true }); execFileSync("unzip", ["-o", "-q", pack, "-d", into]); screenshot = lastScreenshot(into); } catch { /* keep the NDJSON */ }
  }

  if (!end) {
    steps.push({ name: "Run the journey with Kane CLI", status: "error", expected: "a Kane verdict", actual: (stderr.trim().split("\n").pop() || "kane-cli ended without a result").slice(0, 300), evidence: null });
    return { runner: "kane", scenario: scenario.id, status: "error", steps, failure: null, logPath };
  }
  const credits = typeof end.credits_consumed === "number" ? ` (${end.credits_consumed.toFixed(1)} Kane credits)` : "";
  if (end.status === "passed") {
    steps.push({ name: `Kane verified: ${objective.match(/Assert that (.*)$/)?.[1] ?? objective}`, status: "passed", expected: "assertion holds", actual: `${end.one_liner || end.summary || "passed"}${credits}`, evidence: screenshot });
    return { runner: "kane", scenario: scenario.id, status: "passed", steps, failure: null, logPath };
  }
  const assertion = objective.match(/Assert that (.*)$/)?.[1] ?? "the objective holds";
  const productBug = String(end.reason_code || "").startsWith("assertion_error");
  const step = {
    name: `Kane: ${assertion.replace(/\.$/, "")}`,
    status: productBug ? "failed" : "error",
    expected: assertion.replace(/\.$/, ""),
    actual: `${end.one_liner || end.reason || "failed"}${end.summary && end.summary !== end.one_liner ? ` Kane's diagnosis: ${end.summary}` : ""}${credits}`,
    evidence: screenshot,
  };
  steps.push(step);
  return {
    runner: "kane", scenario: scenario.id, status: productBug ? "failed" : "error", steps,
    failure: productBug ? { step: step.name, expected: step.expected, actual: end.one_liner || end.reason, evidencePath: screenshot, diagnosis: end.summary } : null,
    logPath,
  };
}

function lastScreenshot(dir) {
  const tests = join(dir, "tests"); if (!existsSync(tests)) return null;
  for (const t of readdirSync(tests)) {
    const stepsDir = join(tests, t, "steps"); if (!existsSync(stepsDir)) continue;
    const shots = readdirSync(stepsDir).map(s => ({ s, n: Number(s.split("-")[0]) })).sort((a, b) => b.n - a.n)
      .map(({ s }) => join(stepsDir, s, "screenshot.jpg")).filter(existsSync);
    if (shots.length) return shots[0];
  }
  return null;
}
