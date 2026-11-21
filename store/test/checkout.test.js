// The checkout journey over HTTP: placing an order must land on a confirmation showing the order number.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { server } from "../src/server.js";

let base;
before(() => new Promise(r => server.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
after(() => server.close());

const post = (path, body, cookie) => fetch(base + path, {
  method: "POST", redirect: "manual",
  headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie && { Cookie: cookie }) },
  body: new URLSearchParams(body),
});
const cookieOf = res => res.headers.get("set-cookie")?.split(";")[0];

test("placing an order shows a confirmation with the order number", async () => {
  const cookie = cookieOf(await post("/cart/add", { productId: "mug" }));
  const placed = await post("/checkout", { name: "Ada Lovelace", email: "ada@example.com", card: "4242 4242 4242 4242" }, cookie);
  assert.equal(placed.status, 303);
  const html = await (await fetch(base + placed.headers.get("location"))).text();
  assert.match(html, /data-testid="confirmation"/, "confirmation page should render");
  assert.match(html, /ORD-[0-9A-F]{6}/, "order number should be shown");
});

test("a declined card stays on checkout with an error", async () => {
  const cookie = cookieOf(await post("/cart/add", { productId: "mug" }));
  const html = await (await post("/checkout", { name: "Ada", email: "ada@example.com", card: "4000 0000 0000 0002" }, cookie)).text();
  assert.match(html, /declined/i);
});
