# CheckoutGuard architecture

```
 scenarios/*.json ──▶ tester (Kane CLI · local stand-in) ──▶ normalized result ──▶ SQLite run history
                                                                  │ failure
                                                                  ▼
            git worktree + branch ◀── cg repair ◀── evidence brief (journey, checks, expected vs actual)
                    │
                    ▼
     coding agent (OpenCode: edits allowed, shell and web denied)
                    │ diff
                    ▼
     path gate (store/src/ only) ──▶ unit gate (no regressions, ≥1 newly passing) ──▶ same journey rerun
                                                                                        │
                                                                passed ──▶ verified ──▶ human approval ──▶ merge --no-ff
                                                                failed ──▶ retest_failed (stays a failure)
```

## Pieces

| Folder | Role |
|---|---|
| `store/` | The demo storefront (no dependencies). Three seeded bugs; unit tests describe correct behaviour. |
| `scenarios/` | Journeys as plain-language steps plus machine-checkable expectations. |
| `runner/src/loop.js` | Orchestration: run a scenario against any checkout (repo or worktree), record runs and failures, run repair attempts, approve or discard. |
| `runner/src/kane.js` | Kane CLI adapter, filled in from Kane's own docs. |
| `runner/src/local-check.js` | Stand-in tester (headless Chrome via DevTools protocol), used only until Kane is set up and always labelled. |
| `runner/src/agent.js` | Agent adapters: OpenCode, or a hand-written patch for cost-free development. |
| `runner/src/report.js` | Self-contained HTML repair report. |
| `dashboard/` | Next.js UI on 127.0.0.1, calling the runner in-process. |

## Decisions

- **A repair is verified only by rerunning the same journey.** Unit tests are a gate, not the verdict, because other seeded bugs may still fail theirs.
- **The agent can't change the check.** Any change outside `store/src/` rejects the patch before anything runs.
- **Isolation by git worktree.** Each attempt has its own branch and folder, and the patched store runs on its own port, so the original stays untouched until a person merges.
- **Bounded.** 2 attempts per failure, a time limit on the agent, and interrupted attempts are marked instead of hanging.
- **Local runner.** The runner executes code and git commands, so the dashboard binds to loopback and rejects any request whose host or forwarded-for address isn't local. Shareable output is a static report.
- **Honest labelling.** Every run records which tester produced it; stand-in runs are never shown as Kane evidence.

## Tests

- `store/`: `npm test`, the store's own unit tests (they fail on the seeded bugs).
- `runner/`: `npm test`, the loop on a throwaway clone with hand-written patches: detection, cheating patch rejected, wrong fix and attempt limit, unit pass without journey pass stays a failure, correct fix verified then merged only on approval.
