# Submission notes (KaneCLI Hackathon)

Deadline: **26 Nov 2026, 11:59 PM IST** (18:29 UTC, 7:29 PM WAT). Form: https://www.kaneclihack.sh/o/submit

## GitHub URL

https://github.com/BernardOnuh/checkoutguard (public; first commit 21 Nov 2026)

## About your app

**CheckoutGuard: every checkout tested, every fix verified.**

CheckoutGuard closes the loop between Kane CLI and a coding agent for e-commerce checkouts. Each checkout journey is a plain-English Kane objective that ends in one assertion ("Assert that the Subtotal is $54.00"). `kane-cli run --agent` drives a real browser; when Kane reports a confirmed product bug, its finding, diagnosis, screenshots and network log become the evidence brief for the coding agent (Claude Code by default, OpenCode supported). The agent patches the store in an isolated git worktree with file tools only (no shell, no web), and a patch that touches anything outside the store's source (like the tests) is rejected. A unit gate requires no regressions and at least one newly passing test. Then **Kane reruns the same journey: only Kane passing it marks the repair verified.** A person approves the merge in the dashboard; nothing merges on its own.

- **Agent:** Claude Code (headless, file tools only). OpenCode also supported.
- **What Kane does:** it is the tester and the judge. It catches the bug (with a diagnosis the agent reads), and it confirms the fix by rerunning the identical journey. Kane's own infrastructure errors are retried once and never sent for repair.
- **Proof:** all three seeded bugs (cart subtotal ignores quantity, expired coupon accepted, confirmation page reads the wrong parameter) were caught by real Kane CLI 0.10.9 runs, fixed by Claude Code, and verified by Kane reruns. The repair records are in `docs/evidence/`.

## Demo video

YouTube, 3–5 minutes, following `docs/DEMO.md`.

## Posts (at least two)

**X**

> I built CheckoutGuard for the #KaneCLIHack: Kane CLI tests a store's checkout in a real browser, and when it catches a bug, a coding agent patches it from Kane's evidence, then Kane reruns the same journey. Only Kane passing it counts as verified.
>
> 3 seeded checkout bugs: caught, fixed, verified. Nothing merges without a human. 🛒✅
> [video link] [repo link]

**LinkedIn**

> Checkout bugs cost a sale every time they happen, and they ship because nobody clicks through the whole journey before release.
>
> For the KaneCLI Hackathon I built CheckoutGuard, a closed loop between Kane CLI and a coding agent:
> 1. Kane CLI runs each checkout journey in a real browser, written in plain English.
> 2. When Kane confirms a bug, its diagnosis, screenshots and network log go to the coding agent.
> 3. The agent fixes the store's code in an isolated branch (no shell, no web access, and it can't touch the tests).
> 4. Kane reruns the same journey. Only a Kane pass marks the fix verified, and a person approves the merge.
>
> On the demo store, Kane caught all three seeded bugs (a subtotal that ignored quantity, an expired coupon that still applied, and a confirmation page that said "Order not found"), and each fix was verified by a Kane rerun.
>
> Demo: [video link] · Code: [repo link]

## For the judges

- Needs a free testmuai.com account for Kane CLI and either Claude Code or OpenCode for the agent (see the README).
- Fallback if you can't run it: the Kane-verified repair records in `docs/evidence/` and the demo video.
- `cd runner && npm test` checks the loop's guarantees and the Kane adapter without any credits.
