// Cart pricing: subtotal, coupon discount, shipping and total. All amounts in cents.
import { COUPONS, FREE_SHIPPING_FROM_CENTS, SHIPPING_CENTS, productById } from "./catalog.js";

/** Sum of price × quantity for every line in the cart. */
export function subtotal(lines) {
  let cents = 0;
  for (const line of lines) {
    const product = productById(line.productId);
    if (!product) continue;
    cents += product.priceCents;
  }
  return cents;
}

/** Looks up a coupon code. Returns { ok, percentOff } or { ok: false, reason }. */
export function checkCoupon(code, today = new Date()) {
  const coupon = COUPONS[String(code || "").trim().toUpperCase()];
  if (!coupon) return { ok: false, reason: "That coupon code doesn't exist" };
  return { ok: true, percentOff: coupon.percentOff };
}

export function discount(subtotalCents, couponCode, today = new Date()) {
  if (!couponCode) return 0;
  const c = checkCoupon(couponCode, today);
  return c.ok ? Math.round((subtotalCents * c.percentOff) / 100) : 0;
}

export function shipping(subtotalAfterDiscountCents) {
  return subtotalAfterDiscountCents >= FREE_SHIPPING_FROM_CENTS || subtotalAfterDiscountCents === 0 ? 0 : SHIPPING_CENTS;
}

/** Everything the cart and checkout pages show. */
export function quote(lines, couponCode, today = new Date()) {
  const sub = subtotal(lines);
  const off = discount(sub, couponCode, today);
  const ship = shipping(sub - off);
  return { subtotalCents: sub, discountCents: off, shippingCents: ship, totalCents: sub - off + ship };
}

export const money = cents => `$${(cents / 100).toFixed(2)}`;
