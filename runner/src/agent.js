// Coding-agent adapters. The agent works only inside the repair worktree.
//   CG_AGENT=claude (default)    Claude Code, headless (-p), file tools only: no shell, no web, no sub-agents.
//   CG_AGENT=opencode            OpenCode, headless, shell and web access denied, edits allowed (default if
//                                Claude Code isn't installed).
//   CG_AGENT=patch:<file>        Development only: applies a hand-written patch instead of calling an AI, so the
//                                loop can be tested at no cost. Its log says so; it is never shown as an AI fix.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const TIMEOUT_MS = Number(process.env.CG_AGENT_TIMEOUT_MS) || 10 * 60_000;

export async function runAgent({ worktree, brief, allowedDir }) {
  // default: Claude Code when it's installed (it uses your existing login), otherwise OpenCode
  const kind = process.env.CG_AGENT || (spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0 ? "claude" : "opencode");
  if (kind.startsWith("patch:")) {
    const file = kind.slice(6);
    try {
      execFileSync("git", ["apply", file], { cwd: worktree, stdio: ["ignore", "pipe", "pipe"] });
      return { ok: true, agent: "dev-patch", log: `[dev-patch] Applied ${file}. This is a hand-written test patch, not an AI repair.` };
    } catch (e) {
      return { ok: false, agent: "dev-patch", log: String(e.stderr || e.message), error: "The test patch didn't apply" };
    }
  }
  if (kind === "opencode") return runOpenCode({ worktree, brief, allowedDir });
  if (kind === "claude") return runClaude({ worktree, brief, allowedDir });
  return { ok: false, agent: kind, log: "", error: `Unknown agent "${kind}"` };
}

function runOpenCode({ worktree, brief, allowedDir }) {
  // Permissions for this run: file edits are allowed, shell commands and web access are denied.
  // --auto approves only what isn't explicitly denied.
  writeFileSync(join(worktree, "opencode.json"), JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    permission: { edit: "allow", bash: "deny", webfetch: "deny" },
  }, null, 2));
  writeFileSync(join(worktree, ".git", "info", "exclude"), "opencode.json\n", { flag: "a" });
  const prompt = `${brief}\n\nEdit files under ${allowedDir}/ only. When you're done, reply with one paragraph explaining the root cause and the fix.`;
  return new Promise(resolve => {
    const p = spawn("opencode", ["run", "--format", "json", "--auto", "--title", "CheckoutGuard repair", prompt], {
      cwd: worktree, stdio: ["ignore", "pipe", "pipe"], timeout: TIMEOUT_MS,
    });
    let out = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", d => (out += d));
    p.on("error", e => resolve({ ok: false, agent: "opencode", log: out, error: `OpenCode couldn't start: ${e.message}` }));
    p.on("close", (code, signal) => resolve(code === 0
      ? { ok: true, agent: "opencode", log: out }
      : { ok: false, agent: "opencode", log: out, error: signal ? `OpenCode stopped (${signal}, limit ${TIMEOUT_MS / 1000}s)` : `OpenCode exited with code ${code}` }));
  });
}

function runClaude({ worktree, brief, allowedDir }) {
  // Claude Code works in the worktree with file tools only; edits are accepted, everything else is denied.
  const prompt = `${brief}\n\nEdit files under ${allowedDir}/ only. When you're done, reply with one paragraph explaining the root cause and the fix.`;
  const args = [
    "-p", prompt, "--output-format", "stream-json", "--verbose", "--max-turns", "30",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Read,Edit,Write,Glob,Grep",
    "--disallowedTools", "Bash,WebFetch,WebSearch,Task",
  ];
  return new Promise(resolve => {
    const p = spawn("claude", args, { cwd: worktree, stdio: ["ignore", "pipe", "pipe"], timeout: TIMEOUT_MS });
    let out = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", d => (out += d));
    p.on("error", e => resolve({ ok: false, agent: "claude", log: out, error: `Claude Code couldn't start: ${e.message}` }));
    p.on("close", (code, signal) => resolve(code === 0
      ? { ok: true, agent: "claude", log: out }
      : { ok: false, agent: "claude", log: out, error: signal ? `Claude Code stopped (${signal}, limit ${TIMEOUT_MS / 1000}s)` : `Claude Code exited with code ${code}` }));
  });
}
