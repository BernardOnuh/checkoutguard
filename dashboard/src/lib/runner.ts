// The dashboard talks to the local runner in-process. These functions only ever run on this machine's server.
import "server-only";
import { PUBLIC_SITE } from "./public-site";

// The runner is plain JavaScript (ES modules) next to the dashboard. It opens the run history as it loads, so the
// public site (which never calls it: its dashboard routes redirect) doesn't load it at all.
const loop = PUBLIC_SITE ? (null as unknown as typeof import("../../../runner/src/loop.js")) : await import("../../../runner/src/loop.js");
const { db, DATA_DIR, ROOT } = PUBLIC_SITE ? ({} as typeof import("../../../runner/src/db.js")) : await import("../../../runner/src/db.js");

type Row = Record<string, unknown>;
export type Run = { id: string; scenario: string; runner: string; target: string; status: string; steps: string; log_path: string | null; started_at: string; completed_at: string | null };
export type Failure = { id: string; run_id: string; step: string; expected: string; actual: string; evidence_path: string | null };
export type Attempt = { id: string; failure_id: string; attempt: number; branch: string; worktree: string; patch_diff: string; agent_log: string; unit_log: string; status: string; created_at: string; finished_at: string | null };
export type Verification = { id: string; attempt_id: string; rerun_id: string; verdict: string; created_at: string };
export type Scenario = { id: string; title: string; objective: string; steps: string[]; expect: { check: string }[]; seededBug: string };

const all = <T>(sql: string, ...p: (string | number)[]) => (db.prepare(sql).all(...p) as Row[]) as unknown as T[];
const one = <T>(sql: string, ...p: (string | number)[]) => (db.prepare(sql).get(...p) as T | undefined) ?? null;

export const runner = {
  get root() { return ROOT as string; },
  get dataDir() { return DATA_DIR as string; },
  get maxAttempts() { return loop.MAX_ATTEMPTS as number; },
  tester: () => loop.testerName() as string,
  scenarios: () => loop.scenarios() as Scenario[],
  scenario: (id: string) => (loop.scenarios() as Scenario[]).find(s => s.id === id) ?? null,
  runs: (limit = 50) => all<Run>("SELECT * FROM test_runs ORDER BY started_at DESC LIMIT ?", limit),
  run: (id: string) => one<Run>("SELECT * FROM test_runs WHERE id = ?", id),
  latestOriginal: (scenario: string) => one<Run>("SELECT * FROM test_runs WHERE scenario = ? AND target = 'original' ORDER BY started_at DESC LIMIT 1", scenario),
  failureOfRun: (runId: string) => one<Failure>("SELECT * FROM failures WHERE run_id = ?", runId),
  failure: (id: string) => one<Failure>("SELECT * FROM failures WHERE id = ?", id),
  attemptsOf: (failureId: string) => all<Attempt>("SELECT * FROM repair_attempts WHERE failure_id = ? ORDER BY attempt", failureId),
  attempts: (limit = 50) => all<Attempt & { scenario: string }>(`SELECT a.*, r.scenario FROM repair_attempts a JOIN failures f ON f.id = a.failure_id JOIN test_runs r ON r.id = f.run_id ORDER BY a.created_at DESC LIMIT ?`, limit),
  attempt: (id: string) => one<Attempt>("SELECT * FROM repair_attempts WHERE id = ?", id),
  verificationOf: (attemptId: string) => one<Verification>("SELECT * FROM verifications WHERE attempt_id = ?", attemptId),
  runScenario: (id: string) => loop.runScenario(id) as Promise<{ runId: string }>,
  repair: (failureId: string) => loop.repair(failureId) as Promise<Attempt>,
  approve: (attemptId: string) => loop.approve(attemptId) as void,
  discard: (attemptId: string) => loop.discard(attemptId) as void,
};
