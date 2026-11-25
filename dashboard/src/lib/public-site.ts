// True on the public deployment (Vercel sets VERCEL; CG_PUBLIC=1 does the same for a local test build). There, only
// the homepage and the static repair records are served: the dashboard and its actions need the runner, which
// runs Kane CLI and Claude Code and must stay on the developer's own machine.
export const PUBLIC_SITE = !!process.env.VERCEL || process.env.CG_PUBLIC === "1";

/** The demo video, once it's uploaded (set NEXT_PUBLIC_DEMO_URL on the deployment). */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || "";
