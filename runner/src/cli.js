#!/usr/bin/env node
// cg: the local CheckoutGuard runner.
//   cg test <scenario|all>      run checkout journeys against the store
//   cg repair <failureId>       one isolated repair attempt (agent → unit checks → retest)
//   cg approve <attemptId>      merge a verified repair
//   cg discard <attemptId>      delete a repair's worktree and branch (its record stays)
//   cg status                   recent runs and repairs
import { MAX_ATTEMPTS, approve, discard, repair, runScenario, scenarios, testerName } from "./loop.js";
import { db } from "./db.js";

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === "test") {
    const ids = arg === "all" || !arg ? scenarios().map(s => s.id) : [arg];
    console.log(`Tester: ${testerName()}${testerName() === "local-check" ? " (stand-in until Kane CLI is set up)" : ""}`);
    for (const id of ids) {
      const r = await runScenario(id);
      console.log(`${r.status === "passed" ? "✓" : "✗"} ${id}  ${r.status}  run ${r.runId}${r.failure ? `  failure ${r.failureId}\n    ${r.failure.step}: expected ${r.failure.expected}, got ${r.failure.actual}` : ""}`);
    }
  } else if (cmd === "repair") {
    const a = await repair(arg, { onProgress: s => console.log(`… ${s}`) });
    console.log(`${a.status === "verified" ? "✓" : "✗"} repair ${a.id} (attempt ${a.attempt}/${MAX_ATTEMPTS}): ${a.status}  branch ${a.branch}`);
  } else if (cmd === "approve") { approve(arg); console.log(`Merged ${arg}`); }
  else if (cmd === "discard") { discard(arg); console.log(`Discarded ${arg}`); }
  else if (cmd === "status") {
    for (const r of db.prepare("SELECT * FROM test_runs ORDER BY started_at DESC LIMIT 10").all()) console.log(`${r.started_at}  ${r.scenario.padEnd(20)} ${r.runner.padEnd(12)} ${r.target.padEnd(22)} ${r.status}`);
    for (const a of db.prepare("SELECT * FROM repair_attempts ORDER BY created_at DESC LIMIT 10").all()) console.log(`repair ${a.id}  ${a.branch}  ${a.status}`);
  } else {
    console.log("Usage: cg test <scenario|all> | cg repair <failureId> | cg approve <attemptId> | cg discard <attemptId> | cg status");
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
