// The repair loop's guarantees, tested end to end on a throwaway clone of this repo with hand-written patches
// (no AI calls): cheating patches are rejected, wrong fixes fail the unit gate, the attempt limit holds,
// a correct fix is verified only after the journey reruns, and merging needs an explicit approval.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.CG_TESTER = "local"; // these tests cover the loop with the free stand-in check; Kane is tested in kane.test.mjs
const REPO = new URL("../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "cg-loop-"));
const clone = join(tmp, "repo");
const sh = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8" });
let loop, db;

// Makes a patch by editing a file in the clone, diffing, and restoring it.
function patch(name, file, from, to) {
  const p = join(clone, file);
  const orig = readFileSync(p, "utf8");
  writeFileSync(p, orig.replace(from, to));
  const diff = sh(clone, "diff");
  writeFileSync(p, orig);
  const out = join(tmp, `${name}.patch`);
  writeFileSync(out, diff);
  return out;
}
const withAgent = async (patchFile, fn) => { process.env.CG_AGENT = `patch:${patchFile}`; try { return await fn(); } finally { delete process.env.CG_AGENT; } };

before(async () => {
  sh(REPO, "clone", "-q", REPO, clone);
  process.env.CG_ROOT = clone;
  process.env.CG_DATA_DIR = join(tmp, "data");
  loop = await import("../src/loop.js");
  ({ db } = await import("../src/db.js"));
});
after(() => rmSync(tmp, { recursive: true, force: true }));

test("all three seeded bugs are detected with evidence", async () => {
  for (const id of ["cart-total", "expired-coupon", "order-confirmation"]) {
    const r = await loop.runScenario(id);
    assert.equal(r.status, "failed", id);
    assert.ok(r.failureId, `${id} records a failure`);
    assert.ok(r.failure.expected && r.failure.actual, `${id} has expected and actual`);
  }
});

test("a patch that edits the tests is rejected before anything runs", async () => {
  const { failureId } = await loop.runScenario("cart-total");
  const cheat = patch("cheat", "store/test/pricing.test.js", 'assert.equal(subtotal([{ productId: "mug", qty: 3 }]), 5400);', "assert.ok(true);");
  const a = await withAgent(cheat, () => loop.repair(failureId));
  assert.equal(a.status, "rejected");
  assert.match(a.agent_log, /outside store\/src/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM verifications WHERE attempt_id = ?").get(a.id).n, 0, "no retest for a rejected patch");
});

test("a wrong fix fails the unit gate, and the attempt limit holds", async () => {
  const { failureId } = await loop.runScenario("cart-total");
  const wrong = patch("wrong", "store/src/pricing.js", "cents += product.priceCents;", "cents += product.priceCents * 3;");
  assert.equal((await withAgent(wrong, () => loop.repair(failureId))).status, "unit_failed");
  assert.equal((await withAgent(wrong, () => loop.repair(failureId))).status, "unit_failed");
  await assert.rejects(withAgent(wrong, () => loop.repair(failureId)), /limit 2/);
});

test("a fix that passes the unit gate but not the journey stays a failure", async () => {
  const { failureId } = await loop.runScenario("order-confirmation");
  // Fixes a different bug: unit tests improve, but the confirmation journey still fails.
  const other = patch("other", "store/src/pricing.js", "cents += product.priceCents;", "cents += product.priceCents * line.qty;");
  const a = await withAgent(other, () => loop.repair(failureId));
  assert.equal(a.status, "retest_failed");
  assert.equal(db.prepare("SELECT verdict FROM verifications WHERE attempt_id = ?").get(a.id).verdict, "not_verified");
  assert.throws(() => loop.approve(a.id), /Only verified/);
});

test("a correct fix is verified by rerunning the journey, and merges only on approval", async () => {
  const { failureId } = await loop.runScenario("cart-total");
  const good = patch("good", "store/src/pricing.js", "cents += product.priceCents;", "cents += product.priceCents * line.qty;");
  const head = sh(clone, "rev-parse", "HEAD").trim();
  const a = await withAgent(good, () => loop.repair(failureId));
  assert.equal(a.status, "verified");
  assert.equal(sh(clone, "rev-parse", "HEAD").trim(), head, "nothing merged before approval");
  const rerun = db.prepare("SELECT r.* FROM verifications v JOIN test_runs r ON r.id = v.rerun_id WHERE v.attempt_id = ?").get(a.id);
  assert.equal(rerun.status, "passed");
  assert.equal(rerun.target, `repair:${a.id}`);
  loop.approve(a.id);
  assert.match(sh(clone, "log", "-1", "--format=%s"), /Merge verified CheckoutGuard repair/);
  assert.equal((await loop.runScenario("cart-total")).status, "passed", "the original journey passes after the merge");
  assert.ok(!sh(clone, "worktree", "list").includes(a.id), "the merged repair's worktree is removed");
});
