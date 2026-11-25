// The Kane CLI adapter, against a fake kane-cli that replays recorded `run --agent` output (no Kane credits): a
// confirmed product bug becomes a failure with Kane's diagnosis, a pass is a pass, and Kane's own infrastructure
// errors are retried once and never sent for repair.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.PATH = new URL("./fake-kane", import.meta.url).pathname + ":" + process.env.PATH;
process.env.CG_TESTER = "kane";
const { runKane } = await import("../src/kane.js");
const scenario = { id: "cart-total", objective: "…", kane: "Add the Ceramic Mug to the cart. Assert that the Subtotal is $54.00." };
const dir = () => mkdtempSync(join(tmpdir(), "cg-kane-"));

test("a confirmed product bug is a failure carrying Kane's diagnosis", async () => {
  process.env.FAKE_KANE = "bug";
  const r = await runKane(scenario, "http://127.0.0.1:1", dir());
  assert.equal(r.status, "failed");
  assert.equal(r.runner, "kane");
  assert.match(r.failure.actual, /\$18\.00 instead of \$54\.00/);
  assert.match(r.steps.at(-1).actual, /Kane's diagnosis: The cart did not recalculate/);
});

test("a pass is a pass", async () => {
  process.env.FAKE_KANE = "pass";
  const r = await runKane(scenario, "http://127.0.0.1:1", dir());
  assert.equal(r.status, "passed");
  assert.equal(r.failure, null);
});

test("Kane's own errors are retried once and never become a repairable failure", async () => {
  process.env.FAKE_KANE = "crash";
  const r = await runKane(scenario, "http://127.0.0.1:1", dir());
  assert.equal(r.status, "error");
  assert.equal(r.failure, null);
  assert.equal(r.steps[0].name, "Kane: first attempt");
});
