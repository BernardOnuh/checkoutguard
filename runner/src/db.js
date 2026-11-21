// Run history in SQLite (built into Node), following the plan's data model:
// Project → TestRun → Failure → RepairAttempt → Verification.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

// The repository root, two folders up from this file. CG_ROOT overrides it (e.g. when bundled into the dashboard).
export const ROOT = process.env.CG_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DATA_DIR = process.env.CG_DATA_DIR || join(ROOT, "data");
const FILE = join(DATA_DIR, "checkoutguard.db");
mkdirSync(dirname(FILE), { recursive: true });

export const db = new DatabaseSync(FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, repo_path TEXT NOT NULL, preview_url TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    scenario TEXT NOT NULL, runner TEXT NOT NULL,          -- kane | local-check
    target TEXT NOT NULL,                                   -- original | repair:<attemptId>
    status TEXT NOT NULL,                                   -- running | passed | failed | error
    steps TEXT NOT NULL DEFAULT '[]', log_path TEXT,
    started_at TEXT NOT NULL, completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS failures (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id),
    step TEXT NOT NULL, expected TEXT NOT NULL, actual TEXT NOT NULL, evidence_path TEXT
  );
  CREATE TABLE IF NOT EXISTS repair_attempts (
    id TEXT PRIMARY KEY, failure_id TEXT NOT NULL REFERENCES failures(id),
    attempt INTEGER NOT NULL, branch TEXT NOT NULL, worktree TEXT NOT NULL,
    patch_diff TEXT NOT NULL DEFAULT '', agent_log TEXT NOT NULL DEFAULT '', unit_log TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,      -- running | agent_failed | unit_failed | retest_failed | verified | merged | rejected
    created_at TEXT NOT NULL, finished_at TEXT
  );
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES repair_attempts(id),
    rerun_id TEXT NOT NULL REFERENCES test_runs(id), verdict TEXT NOT NULL, created_at TEXT NOT NULL
  );
`);

export const now = () => new Date().toISOString();
export const newId = prefix => `${prefix}_${randomBytes(5).toString("hex")}`;
