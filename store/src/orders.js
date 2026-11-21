// Placing orders. Payments go to a fake provider: no card is ever charged.
import { randomBytes } from "node:crypto";
import { quote } from "./pricing.js";

const orders = new Map();

/** The fake payment provider accepts the test card 4242 4242 4242 4242 and declines everything else. */
export function fakeCharge(cardNumber, amountCents) {
  const digits = String(cardNumber || "").replace(/\s/g, "");
  if (digits !== "4242424242424242") return { ok: false, reason: "Card declined (use the test card 4242 4242 4242 4242)" };
  return { ok: true, chargeId: `ch_test_${randomBytes(6).toString("hex")}`, amountCents };
}

export function placeOrder({ lines, coupon, name, email, card }) {
  if (!lines.length) return { ok: false, reason: "Your cart is empty" };
  if (!name || !email) return { ok: false, reason: "Enter your name and email" };
  const q = quote(lines, coupon);
  const charge = fakeCharge(card, q.totalCents);
  if (!charge.ok) return charge;
  const id = `ORD-${randomBytes(3).toString("hex").toUpperCase()}`;
  const order = { id, lines, coupon, name, email, ...q, chargeId: charge.chargeId, placedAt: new Date().toISOString() };
  orders.set(id, order);
  return { ok: true, order };
}

export const getOrder = id => orders.get(id) ?? null;
