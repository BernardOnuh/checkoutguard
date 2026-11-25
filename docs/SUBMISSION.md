# Submission notes (KaneCLI Hackathon)

Deadline: **26 Nov 2026, 11:59 PM IST** (18:29 UTC, 7:29 PM WAT). Form: https://www.kaneclihack.sh/o/submit

## The form

| Field | Answer |
|---|---|
| Project name | CheckoutGuard |
| One-liner | Kane CLI tests your checkout in a real browser, a coding agent fixes what breaks, and the fix only counts when Kane passes the same journey again. |
| Agent used | Claude Code (headless, file tools only, in an isolated git worktree). OpenCode is also supported. |
| YouTube demo video | *(the YouTube link of `checkoutguard-demo.mp4`, 3:34, opens on the Kane run report)* |
| GitHub URL | https://github.com/BernardOnuh/checkoutguard |

**Project details**

CheckoutGuard closes the loop between Kane CLI and a coding agent for e-commerce checkouts.

- **Kane tests.** Each checkout journey is a plain-English Kane objective ending in one assertion ("…change the Ceramic Mug quantity to 3 and click Update. Assert that the Subtotal row in the cart totals shows $54.00."). CheckoutGuard runs `kane-cli run --agent` and reads the NDJSON: `run_end` with `assertion_error.confirmed_product_bug` is a real bug; Kane's own `agent_error`/`infra_error` codes are retried once and never sent for repair.
- **Kane's evidence is the agent's brief.** The failed step, Kane's diagnosis, evidence-pack screenshots and the network log go to Claude Code.
- **The agent fixes, sandboxed.** An isolated git worktree, file tools only (no shell, no web). A patch touching anything outside `store/src/` (tests, Kane objectives) is rejected before it runs. A unit gate requires no regressions and at least one newly passing test.
- **Kane decides.** Kane reruns the identical journey on the patched store; only a Kane pass marks the repair verified. A failed rerun stays a failure. A person approves the merge; nothing merges on its own.

Proof: on the demo store, real Kane CLI runs caught all three seeded bugs (cart subtotal ignored quantity; an expired coupon still applied; the confirmation page said "Order not found"), Claude Code fixed each, and a Kane rerun verified each fix. In the recorded demo, Kane's first rerun of a correct fix failed on its own check, so CheckoutGuard refused to verify it; attempt 2 passed. Repair records and Kane run reports are in `docs/evidence/` and on the site.

Live: https://checkoutguard-eight.vercel.app (homepage, intro film, repair records, write-up and deck; the dashboard runs locally because it spends Kane credits and lets an agent change code). Kane run report: https://checkoutguard-eight.vercel.app/evidence/kane-cart-total-live.html

## Scored assets (share every link)

| Asset | Points | Link |
|---|---|---|
| Demo video with voiceover (2–4 min, leads with the Kane run report) | 7 | YouTube link |
| Deck | 4 | https://checkoutguard-eight.vercel.app/deck |
| Blog post | 4 | https://checkoutguard-eight.vercel.app/blog |
| LinkedIn post (tag the TestMu AI page + event hashtag) | 3 | your post |
| X post (tag @kane_cli + event hashtag; a thread counts as one) | 3 | your thread |
| Show HN (own words, own account, links to repo or demo) | 2 | your post |
| Reach bonus (any reply/repost/comment from outside the team) | 2 | — |

Event hashtag: the site's code uses `#KaneCLIHackDay`; other online entrants use `#KaneCLIHackathon`. Using both is safe.

## X (thread)

Images and text are in `~/Desktop/checkoutguard-thread/` and the chat. Post 1 must tag **@kane_cli** and carry the hashtags.

## LinkedIn

> Checkout bugs cost a sale every time they happen, and they ship because nobody clicks through the whole journey before release. Coding agents make it worse: they say "done" when the tests they can see pass.
>
> For the KaneCLI Hackathon by TestMu AI, I built CheckoutGuard, a closed loop between Kane CLI and a coding agent:
> 1. Kane CLI runs each checkout journey in a real browser, written in plain English.
> 2. When Kane confirms a bug, its diagnosis, screenshots and network log go to the coding agent (Claude Code).
> 3. The agent fixes the store in an isolated branch: no shell, no web, and it can't touch the tests.
> 4. Kane reruns the same journey. Only a Kane pass marks the fix verified, and a person approves the merge.
>
> In my live demo, Kane's first rerun of a correct fix failed on its own check, so CheckoutGuard refused to call it verified. The second attempt passed. That's the point: the browser decides, not the agent.
>
> Across the three seeded bugs, Kane caught all three, the agent fixed all three, and Kane verified all three.
>
> Demo: [YouTube] · Site: checkoutguard-eight.vercel.app · Write-up: checkoutguard-eight.vercel.app/blog · Code: github.com/BernardOnuh/checkoutguard
>
> #KaneCLIHackathon #KaneCLIHackDay #KaneCLI #AIAgents

(Type `@TestMu AI` in the post and pick the company page from the list so it's a real tag.)

## Show HN

Title: **Show HN: CheckoutGuard – a coding agent's checkout fix only counts if a real browser agrees**

URL: https://github.com/BernardOnuh/checkoutguard

Text (write it in your own words; a starting point):

> I built this for the KaneCLI hackathon. Each checkout journey is a plain-English objective that Kane CLI runs in a real browser. When it fails, Kane's diagnosis and screenshots go to a coding agent working in an isolated git worktree with file tools only. The fix only counts as verified when Kane reruns the same journey and passes; a person approves the merge. In my demo the first rerun of a correct fix failed on Kane's own check, and the system refused to verify it, which is the behaviour I wanted. Runs locally; the demo store has three seeded bugs.

## For the judges

- Needs a free testmuai.com account for Kane CLI and either Claude Code or OpenCode (see the README).
- If you can't run it: the Kane run reports and repair records (`docs/evidence/`, also on the site) and the demo video.
- `cd runner && npm test` checks the loop's guarantees and the Kane adapter without spending credits.
