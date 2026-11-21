// The demo store's products and coupons. Prices are in cents.
export const PRODUCTS = [
  { id: "mug", name: "Ceramic Mug", priceCents: 1800, emoji: "☕" },
  { id: "tote", name: "Canvas Tote", priceCents: 2400, emoji: "👜" },
  { id: "cap", name: "Logo Cap", priceCents: 2000, emoji: "🧢" },
  { id: "hoodie", name: "Zip Hoodie", priceCents: 5500, emoji: "🧥" },
];

// SAVE10 takes 10% off the subtotal. OLD20 expired and must be rejected.
export const COUPONS = {
  SAVE10: { percentOff: 10, expires: "2099-12-31" },
  OLD20: { percentOff: 20, expires: "2024-01-01" },
};

export const SHIPPING_CENTS = 500;
export const FREE_SHIPPING_FROM_CENTS = 10000;

export const productById = id => PRODUCTS.find(p => p.id === id);
