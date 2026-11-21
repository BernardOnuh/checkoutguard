// What a correct checkout must do. These fail while the seeded bugs are present.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCoupon, quote, subtotal } from "../src/pricing.js";

test("subtotal multiplies each price by its quantity", () => {
  assert.equal(subtotal([{ productId: "mug", qty: 3 }]), 5400);
  assert.equal(subtotal([{ productId: "mug", qty: 2 }, { productId: "tote", qty: 1 }]), 6000);
});

test("shipping is $5 under $100 and free from $100", () => {
  assert.equal(quote([{ productId: "mug", qty: 1 }]).totalCents, 1800 + 500);
  assert.equal(quote([{ productId: "hoodie", qty: 2 }]).shippingCents, 0);
});

test("SAVE10 takes 10% off the subtotal", () => {
  const q = quote([{ productId: "tote", qty: 2 }], "SAVE10");
  assert.equal(q.discountCents, 480);
  assert.equal(q.totalCents, 4800 - 480 + 500);
});

test("expired coupons are rejected and give no discount", () => {
  const c = checkCoupon("OLD20", new Date("2026-11-21"));
  assert.equal(c.ok, false);
  assert.match(c.reason, /expired/i);
  assert.equal(quote([{ productId: "tote", qty: 2 }], "OLD20").discountCents, 0);
});

test("unknown coupons are rejected", () => {
  assert.equal(checkCoupon("NOPE").ok, false);
});
