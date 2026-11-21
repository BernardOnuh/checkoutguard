// Stand-in browser check used only until Kane CLI is set up. It drives headless Chrome through a scenario
// with fixed actions and checks the expectations. Results are labelled runner: "local-check" and are never
// presented as Kane evidence.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The concrete actions behind each scenario's plain-language steps.
const ACTIONS = {
  "cart-total": [
    ["open", "/"],
    ["submit", "[data-testid=product-mug] form"],
    ["fill", "input[name=qty]", "3"],
    ["submit", "[data-testid=line-mug] form"],
  ],
  "expired-coupon": [
    ["open", "/"],
    ["submit", "[data-testid=product-tote] form"],
    ["fill", "input[name=coupon]", "OLD20"],
    ["submit", "form[action='/cart/coupon']"],
  ],
  "order-confirmation": [
    ["open", "/"],
    ["submit", "[data-testid=product-cap] form"],
    ["open", "/checkout"],
    ["fill", "#name", "Ada Lovelace"],
    ["fill", "#email", "ada@example.com"],
    ["fill", "#card", "4242 4242 4242 4242"],
    ["submit", "form[action='/checkout']"],
  ],
};

async function browser() {
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), "cg-chrome-"));
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === "page"); } catch {} }
  if (!target) { proc.kill(); throw new Error("Chrome didn't start"); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const waitLoad = async () => { for (let i = 0; i < 40; i++) { await sleep(150); if ((await evaluate("document.readyState")) === "complete") return; } };
  return {
    evaluate,
    async open(url) { await send("Page.navigate", { url }); await waitLoad(); },
    async screenshot(path) { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(path, Buffer.from(r.result.data, "base64")); },
    waitLoad,
    async close() {
      ws.close();
      const exited = new Promise(r => proc.once("exit", r));
      proc.kill();
      await Promise.race([exited, sleep(3000)]);
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}

/** Runs one scenario against baseUrl and returns the normalized result. Evidence is written to evidenceDir. */
export async function runLocalCheck(scenario, baseUrl, evidenceDir) {
  mkdirSync(evidenceDir, { recursive: true });
  const actions = ACTIONS[scenario.id];
  if (!actions) throw new Error(`No local-check actions for scenario ${scenario.id}`);
  const b = await browser();
  const log = [];
  const steps = [];
  try {
    for (const [kind, a, value] of actions) {
      if (kind === "open") await b.open(baseUrl + a);
      if (kind === "fill") {
        const ok = await b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(a)}); if (!el) return false; el.value = ${JSON.stringify(value)}; return true; })()`);
        if (!ok) throw new Error(`Couldn't find ${a}`);
      }
      if (kind === "submit") {
        const ok = await b.evaluate(`(() => { const f = document.querySelector(${JSON.stringify(a)}); if (!f) return false; f.requestSubmit ? f.requestSubmit() : f.submit(); return true; })()`);
        if (!ok) throw new Error(`Couldn't find ${a}`);
        await sleep(300); await b.waitLoad();
      }
      log.push(`${kind} ${a}${value ? ` = ${value}` : ""} → ${await b.evaluate("location.pathname + location.search")}`);
    }
    const finalShot = join(evidenceDir, "final.png");
    await b.screenshot(finalShot);
    for (const e of scenario.expect) {
      const actual = await b.evaluate(`document.querySelector(${JSON.stringify(e.selector)})?.innerText?.trim() ?? null`);
      let pass;
      if (e.absent) pass = actual === null;
      else if (actual === null) pass = false;
      else if (e.equals) pass = actual === e.equals;
      else if (e.contains) pass = actual.toLowerCase().includes(e.contains.toLowerCase());
      else if (e.matches) pass = new RegExp(e.matches).test(actual);
      steps.push({
        name: e.check,
        status: pass ? "passed" : "failed",
        expected: e.absent ? "not shown" : e.equals ?? (e.contains ? `contains "${e.contains}"` : `matches ${e.matches}`),
        actual: actual === null ? "not shown" : actual,
        evidence: finalShot,
      });
    }
    const pageText = await b.evaluate("document.body.innerText");
    writeFileSync(join(evidenceDir, "page.txt"), pageText);
    writeFileSync(join(evidenceDir, "actions.log"), log.join("\n") + "\n");
  } catch (e) {
    steps.push({ name: "Run the journey", status: "error", expected: "journey completes", actual: e.message, evidence: null });
  } finally {
    await b.close();
  }
  const failed = steps.find(s => s.status !== "passed");
  return {
    runner: "local-check",
    scenario: scenario.id,
    status: steps.some(s => s.status === "error") ? "error" : failed ? "failed" : "passed",
    steps,
    failure: failed ? { step: failed.name, expected: failed.expected, actual: failed.actual, evidencePath: failed.evidence } : null,
    logPath: join(evidenceDir, "actions.log"),
  };
}
