# Demo script (3–5 minutes)

Before recording: reset the store (`git checkout main`, bugs present), delete `data/`, start the dashboard, make sure Kane CLI is signed in (`kane-cli balance`) and Claude Code works (`claude --version`). Every run in the video must be labelled **Kane CLI**.

| Time | Show | Say |
|---|---|---|
| 0:00–0:30 | Title, then the store's checkout | "A checkout bug costs a sale every time it happens, and it often ships because nobody clicks through the whole journey." |
| 0:30–1:10 | Northwind Goods: add a mug, set quantity 3. Subtotal shows $18.00 | "Three mugs at $18 should be $54. The store says $18." |
| 1:10–2:00 | Dashboard → Run all journeys. Three fail. Open cart-total evidence: steps, expected vs actual, screenshot | "Kane ran the real journey in a browser and caught it, with evidence." |
| 2:00–3:00 | Start repair. Timeline: agent working in an isolated worktree. Show the one-line diff | "Claude Code gets Kane's evidence and diagnosis and can only touch the store's source. No shell, no web, and it can't edit the tests." |
| 3:00–3:45 | Unit checks pass, the same journey reruns with Kane and passes. Verified. Before/after screenshots | "It's only verified because Kane ran the same journey again and it passed." |
| 3:45–4:30 | Approve and merge. Download the report. Show a rejected attempt (a patch that edited a test) | "Nothing merges without a person. A patch that touches the tests is rejected before it runs. Next: CI runs on every pull request." |
