# CheckoutGuard

**Every checkout tested. Every fix verified.**

CheckoutGuard tests checkout journeys, turns a real failure into evidence, has a coding agent patch the source in an isolated git worktree, and reruns the same journey. A repair is only marked **verified** when the rerun passes. A failed retest stays a failure. Nothing is merged without a person approving it.

Built for the KaneCLI Hackathon (submit by 26 Nov 2026, 11:59 PM IST). Check https://www.kaneclihack.sh for current rules.

## Status

| Piece | State |
|---|---|
| Demo store (`store/`) with three seeded checkout bugs | Done |
| Scenarios (`scenarios/`) | Done: cart total, expired coupon, order confirmation |
| Repair loop (`runner/`): worktree, agent, unit checks, rerun, verdict, approval | Done and tested |
| Dashboard (`dashboard/`): journeys, evidence, repair timeline, diff, approve/discard | Done |
| **Kane CLI tester** (`runner/src/kane.js`) | **Done.** Every journey runs with `kane-cli run --agent`; Kane's verdict, diagnosis and evidence pack drive the loop. Tested against real Kane CLI 0.10.9 on all three bugs, plus adapter tests on recorded output |
| **Coding agents** | **Claude Code** (default, file tools only) and **OpenCode**; both run headless in the repair worktree with no shell or web access |

### Proven with real Kane CLI runs

All three seeded bugs went round the full loop: Kane caught each one, Claude Code patched it from Kane's evidence, the unit gate passed, and Kane reran the same journey and confirmed the fix. The repair records (Kane's steps and diagnosis, the patch, the unit checks, the passing rerun) are in [`docs/evidence/`](docs/evidence/):

| Bug | What Kane CLI reported | Fix | Kane rerun |
|---|---|---|---|
| [Cart subtotal](docs/evidence/kane-cart-total.html) | "After the mug quantity changed to 3, the cart still displayed a subtotal of $18.00 instead of $54.00." | `subtotal()` multiplies by quantity | passed |
| [Expired coupon](docs/evidence/kane-expired-coupon.html) | "The cart accepted OLD20 and applied a 20% discount instead of showing that the coupon had expired." | `checkCoupon()` checks the expiry date | passed |
| [Order confirmation](docs/evidence/kane-order-confirmation.html) | "After placing the order, checkout redirected to an Order not found page instead of showing the customer confirmation and order number." | the confirmation page reads `?order=` | passed |

The patches were then discarded (not merged), so the bugs stay seeded for anyone who wants to run it themselves.

## How it works

1. A journey (`scenarios/*.json`) runs against the store with **Kane CLI**: its `kane` objective, in plain English, ends in one assertion (for example "Assert that the Subtotal is $54.00."). `kane-cli run --agent` drives a real Chrome and streams NDJSON.
2. Kane's `run_end` decides: **passed**, a **confirmed product bug** (`assertion_error.*`, which becomes a failure carrying Kane's one-line finding, its diagnosis, the last step's screenshot and the evidence pack), or Kane's own error (`agent_error.*`, `infra_error.*`), which is retried once and never sent for repair.
3. `cg repair` creates a git worktree on a new branch and hands **Kane's evidence and diagnosis** to the coding agent. The agent may edit files but has **shell and web access denied**.
4. The patch is **rejected if it changes anything outside `store/src/`**, so the agent can't "fix" a failure by editing the tests.
5. Unit checks: no test that passed before may fail, and at least one failing test must now pass.
6. The patched store starts on its own port and **Kane reruns the same journey**. Only Kane passing it means verified. A second attempt, if needed, gets the failed rerun as extra context.
7. You review the diff in the dashboard and **approve** (merge with `--no-ff`) or **discard**. At most 2 attempts per failure.

The demo store's seeded bugs:

| Scenario | Bug |
|---|---|
| `cart-total` | Subtotal ignores quantity: 3 mugs show $18.00 instead of $54.00 |
| `expired-coupon` | The expired code `OLD20` is accepted |
| `order-confirmation` | After paying, the confirmation page says "Order not found" (it reads `?id=`, checkout sends `?order=`) |

## Run it

Requires Node 22.5+ (built-in SQLite), Google Chrome, [Kane CLI](https://www.testmuai.com/support/docs/kane-cli-introduction/) and a coding agent.

```bash
npm install -g @testmuai/kane-cli && kane-cli login     # free testmuai.com account
kane-cli config project <id> && kane-cli config folder <id>   # once (or let the first run pick defaults)
# coding agent: Claude Code (https://claude.com/claude-code, uses your login) or OpenCode (opencode auth login)
```

```bash
cd store && npm start                    # demo store on http://127.0.0.1:4300 (optional, for browsing)
cd dashboard && npm install && npm run dev   # dashboard on http://127.0.0.1:3100

# or from the command line
node runner/src/cli.js test all
node runner/src/cli.js repair <failureId>
node runner/src/cli.js approve <attemptId>     # or: discard <attemptId>
node runner/src/cli.js report <attemptId>      # self-contained HTML repair report
node runner/src/cli.js status

cd runner && npm test                          # the loop's guarantees on a throwaway clone, and the Kane adapter on recorded
                                               # Kane output (no AI calls, no Kane credits)
```

More: [architecture](docs/ARCHITECTURE.md) · [demo script](docs/DEMO.md)

The dashboard and runner only accept requests from this machine. The runner runs code and git commands, so it is never exposed publicly.

### Settings

| Variable | Default | |
|---|---|---|
| `CG_TESTER` | `kane` when `kane-cli` is installed | `local` uses the stand-in headless-Chrome check instead (free; labelled *Local check* everywhere, never shown as Kane evidence) |
| `CG_KANE_TIMEOUT_S` | `300` | Kane run time limit |
| `CG_AGENT` | `claude` if installed, else `opencode` | `patch:<file>` applies a hand-written patch instead (development only, no AI cost, labelled in the log) |
| `CG_MAX_ATTEMPTS` | `2` | Repair attempts per failure |
| `CG_AGENT_TIMEOUT_MS` | `600000` | Agent time limit |
| `CG_DATA_DIR` | `data/` | Run history (SQLite) and evidence |
| `CG_ROOT` | repo root | Repository to test and repair |

## Safety

- Payments use a fake provider that accepts only the test card 4242 4242 4242 4242; nothing is ever charged.
- Repairs run in temporary git worktrees; the agent has no shell or web access; patches outside `store/src/` are rejected.
- Attempts are capped, the original failure's evidence is kept, and merging always needs approval. Nothing is deployed automatically.

## Data model

`projects` → `test_runs` (scenario, runner, target, status, steps) → `failures` (step, expected, actual, evidence) → `repair_attempts` (branch, worktree, diff, agent log, unit log, status) → `verifications` (rerun, verdict).
