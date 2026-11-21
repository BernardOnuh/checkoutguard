import "server-only";

// The runner executes code and git commands, so it must never be reachable from another machine.
// The dashboard binds to 127.0.0.1, and every action also checks the request came from this machine:
// the Host must be loopback, and any forwarded-for address (Next.js adds one itself) must be loopback too.
const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost", "[::1]", "::ffff:127.0.0.1"]);

export function isLocal(req: Request) {
  const host = (req.headers.get("host") || "").replace(/:\d+$/, "");
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",").map(s => s.trim()).filter(Boolean);
  return LOOPBACK.has(host) && forwarded.every(a => LOOPBACK.has(a));
}
