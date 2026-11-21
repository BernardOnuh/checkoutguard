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
| **Kane CLI adapter** (`runner/src/kane.js`) | **Waiting for Kane CLI to be installed.** It will be wired to Kane's real commands from its own docs. Until then journeys run with a stand-in headless-Chrome check, labelled *Local check* everywhere and never presented as Kane evidence. |
| **OpenCode agent** | Built. Needs `opencode auth login` with an AI provider before it can make real repairs. |

## How it works

1. A journey (`scenarios/*.json`) runs against the store. Kane CLI will do this; for now the local check does.
2. The result is normalized into a failure: the step, expected vs actual, a screenshot and logs.
3. `cg repair` creates a git worktree on a new branch and hands the evidence to the coding agent. The agent may edit files but has **shell and web access denied**.
4. The patch is **rejected if it changes anything outside `store/src/`**, so the agent can't "fix" a failure by editing the tests.
5. Unit checks: no test that passed before may fail, and at least one failing test must now pass.
6. The patched store starts on its own port and **the same journey reruns**. Passing means verified.
7. You review the diff in the dashboard and **approve** (merge with `--no-ff`) or **discard**. At most 2 attempts per failure.

The demo store's seeded bugs:

| Scenario | Bug |
|---|---|
| `cart-total` | Subtotal ignores quantity: 3 mugs show $18.00 instead of $54.00 |
| `expired-coupon` | The expired code `OLD20` is accepted |
| `order-confirmation` | After paying, the confirmation page says "Order not found" (it reads `?id=`, checkout sends `?order=`) |

## Run it

Requires Node 22.5+ (built-in SQLite) and Google Chrome.

```bash
cd store && npm start                    # demo store on http://127.0.0.1:4300 (optional, for browsing)
cd dashboard && npm install && npm run dev   # dashboard on http://127.0.0.1:3100

# or from the command line
node runner/src/cli.js test all
node runner/src/cli.js repair <failureId>
node runner/src/cli.js approve <attemptId>     # or: discard <attemptId>
node runner/src/cli.js status
```

The dashboard and runner only accept requests from this machine. The runner runs code and git commands, so it is never exposed publicly.

### Settings

| Variable | Default | |
|---|---|---|
| `CG_AGENT` | `opencode` | `patch:<file>` applies a hand-written patch instead (development only, no AI cost, labelled in the log) |
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
