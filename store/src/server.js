// Demo storefront: product list → cart (quantities, coupon) → checkout form → confirmation.
// Plain server-rendered HTML forms so any browser agent can drive it. The cart lives in a cookie.
import { createServer } from "node:http";
import { PRODUCTS, productById } from "./catalog.js";
import { checkCoupon, money, quote } from "./pricing.js";
import { getOrder, placeOrder } from "./orders.js";

const PORT = Number(process.env.PORT) || 4300;
const HOST = process.env.HOST || "127.0.0.1";

// ---------- cart cookie ----------
const readCart = req => {
  const raw = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith("cart="))?.slice(5);
  try { const c = JSON.parse(Buffer.from(decodeURIComponent(raw || ""), "base64url").toString()); return { lines: c.lines || [], coupon: c.coupon || "" }; }
  catch { return { lines: [], coupon: "" }; }
};
const cartCookie = cart => `cart=${Buffer.from(JSON.stringify(cart)).toString("base64url")}; Path=/; HttpOnly; SameSite=Lax`;

async function form(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return Object.fromEntries(new URLSearchParams(body));
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- layout ----------
function page(title, body, cart) {
  const count = cart ? cart.lines.reduce((n, l) => n + l.qty, 0) : 0;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Northwind Goods</title>
<style>
  *{box-sizing:border-box} body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1917;background:#fafaf9}
  header{background:#1c1917;color:#fff} .wrap{max-width:880px;margin:0 auto;padding:0 20px}
  header .wrap{display:flex;justify-content:space-between;align-items:center;height:60px} header a{color:#fff;text-decoration:none;font-weight:700}
  main{padding:32px 0 64px} h1{margin:0 0 20px;font-size:28px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:18px} .emoji{font-size:44px} .price{font-weight:700}
  button,.btn{background:#ea580c;color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  .ghost{background:#fff;color:#1c1917;border:1px solid #d6d3d1} input{font:inherit;padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px;width:100%}
  table{width:100%;border-collapse:collapse} td,th{padding:10px 8px;border-bottom:1px solid #e7e5e4;text-align:left} .r{text-align:right}
  .totals div{display:flex;justify-content:space-between;padding:4px 0} .grand{font-size:20px;font-weight:800;border-top:2px solid #1c1917;margin-top:6px;padding-top:8px!important}
  .msg{padding:10px 14px;border-radius:10px;margin:12px 0} .err{background:#fee2e2;color:#991b1b} .ok{background:#dcfce7;color:#166534}
  label{display:block;font-weight:600;margin:12px 0 4px} .row{display:flex;gap:8px;align-items:center}
</style></head><body>
<header><div class="wrap"><a href="/">🛍️ Northwind Goods</a><a href="/cart" data-testid="cart-link">Cart (${count})</a></div></header>
<main class="wrap">${body}</main></body></html>`;
}

function totalsHtml(q, coupon) {
  return `<div class="totals" data-testid="totals">
  <div><span>Subtotal</span><span data-testid="subtotal">${money(q.subtotalCents)}</span></div>
  ${q.discountCents ? `<div><span>Discount (${esc(coupon)})</span><span data-testid="discount">−${money(q.discountCents)}</span></div>` : ""}
  <div><span>Shipping</span><span data-testid="shipping">${q.shippingCents ? money(q.shippingCents) : "Free"}</span></div>
  <div class="grand"><span>Total</span><span data-testid="total">${money(q.totalCents)}</span></div></div>`;
}

// ---------- pages ----------
const shop = cart => page("Shop", `<h1>Shop</h1><div class="grid">${PRODUCTS.map(p => `
  <div class="card" data-testid="product-${p.id}"><div class="emoji">${p.emoji}</div><h3>${esc(p.name)}</h3><p class="price">${money(p.priceCents)}</p>
  <form method="post" action="/cart/add"><input type="hidden" name="productId" value="${p.id}"><button type="submit">Add to cart</button></form></div>`).join("")}</div>`, cart);

function cartPage(cart, msg) {
  if (!cart.lines.length) return page("Cart", `<h1>Your cart</h1><p>Your cart is empty.</p><a class="btn" href="/">Continue shopping</a>`, cart);
  const q = quote(cart.lines, cart.coupon);
  const rows = cart.lines.map(l => {
    const p = productById(l.productId);
    return `<tr data-testid="line-${l.productId}"><td>${p.emoji} ${esc(p.name)}</td><td>${money(p.priceCents)}</td>
      <td><form method="post" action="/cart/qty" class="row"><input type="hidden" name="productId" value="${l.productId}">
      <input type="number" name="qty" min="0" max="20" value="${l.qty}" style="width:80px" aria-label="Quantity of ${esc(p.name)}"><button class="ghost" type="submit">Update</button></form></td>
      <td class="r">${money(p.priceCents * l.qty)}</td></tr>`;
  }).join("");
  return page("Cart", `<h1>Your cart</h1>${msg || ""}
  <div class="card"><table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th class="r">Line total</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="card" style="margin-top:16px"><form method="post" action="/cart/coupon" class="row"><input name="coupon" placeholder="Coupon code" value="${esc(cart.coupon)}" aria-label="Coupon code"><button class="ghost" type="submit">Apply coupon</button></form>
  ${totalsHtml(q, cart.coupon)}<p style="margin-top:16px"><a class="btn" href="/checkout" data-testid="go-checkout">Checkout</a></p></div>`, cart);
}

const checkoutPage = (cart, err) => {
  if (!cart.lines.length) return page("Checkout", `<h1>Checkout</h1><p>Your cart is empty.</p>`, cart);
  const q = quote(cart.lines, cart.coupon);
  return page("Checkout", `<h1>Checkout</h1>${err ? `<p class="msg err">${esc(err)}</p>` : ""}
  <div class="card">${totalsHtml(q, cart.coupon)}</div>
  <form method="post" action="/checkout" class="card" style="margin-top:16px">
    <label for="name">Full name</label><input id="name" name="name" autocomplete="name" required>
    <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required>
    <label for="card">Card number <small>(test card 4242 4242 4242 4242, nothing is charged)</small></label><input id="card" name="card" inputmode="numeric" required>
    <p style="margin-top:18px"><button type="submit" data-testid="place-order">Place order · ${money(q.totalCents)}</button></p>
  </form>`, cart);
};

function confirmationPage(url, cart) {
  const order = getOrder(url.searchParams.get("id"));
  if (!order) return page("Order", `<h1>Order not found</h1><p>We couldn't find that order.</p>`, cart);
  return page("Order confirmed", `<h1 data-testid="confirmation">Thank you, ${esc(order.name)}!</h1>
  <div class="card"><p>Your order number is <strong data-testid="order-id">${order.id}</strong>. A receipt was sent to ${esc(order.email)}.</p>
  ${totalsHtml(order, order.coupon)}<p><small>Test payment ${order.chargeId}: no real card was charged.</small></p></div>`, cart);
}

// ---------- routes ----------
const send = (res, status, html, headers = {}) => { res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...headers }); res.end(html); };
const redirect = (res, to, cart) => { res.writeHead(303, { Location: to, ...(cart && { "Set-Cookie": cartCookie(cart) }) }); res.end(); };

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const cart = readCart(req);
  try {
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, shop(cart));
    if (req.method === "GET" && url.pathname === "/cart") return send(res, 200, cartPage(cart));
    if (req.method === "GET" && url.pathname === "/checkout") return send(res, 200, checkoutPage(cart));
    if (req.method === "GET" && url.pathname === "/confirmation") return send(res, 200, confirmationPage(url, cart));
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, "ok");
    if (req.method === "POST" && url.pathname === "/cart/add") {
      const { productId } = await form(req);
      if (productById(productId)) {
        const line = cart.lines.find(l => l.productId === productId);
        line ? (line.qty += 1) : cart.lines.push({ productId, qty: 1 });
      }
      return redirect(res, "/cart", cart);
    }
    if (req.method === "POST" && url.pathname === "/cart/qty") {
      const { productId, qty } = await form(req);
      const n = Math.max(0, Math.min(20, Math.floor(Number(qty) || 0)));
      cart.lines = cart.lines.map(l => (l.productId === productId ? { ...l, qty: n } : l)).filter(l => l.qty > 0);
      return redirect(res, "/cart", cart);
    }
    if (req.method === "POST" && url.pathname === "/cart/coupon") {
      const { coupon } = await form(req);
      const code = String(coupon || "").trim().toUpperCase();
      if (!code) { cart.coupon = ""; return redirect(res, "/cart", cart); }
      const check = checkCoupon(code);
      if (!check.ok) { cart.coupon = ""; return send(res, 200, cartPage(cart, `<p class="msg err" data-testid="coupon-error">${esc(check.reason)}</p>`), { "Set-Cookie": cartCookie(cart) }); }
      cart.coupon = code;
      return send(res, 200, cartPage(cart, `<p class="msg ok" data-testid="coupon-ok">Coupon ${esc(code)} applied: ${check.percentOff}% off</p>`), { "Set-Cookie": cartCookie(cart) });
    }
    if (req.method === "POST" && url.pathname === "/checkout") {
      const f = await form(req);
      const r = placeOrder({ lines: cart.lines, coupon: cart.coupon, name: f.name, email: f.email, card: f.card });
      if (!r.ok) return send(res, 200, checkoutPage(cart, r.reason));
      return redirect(res, `/confirmation?order=${r.order.id}`, { lines: [], coupon: "" });
    }
    send(res, 404, page("Not found", "<h1>Page not found</h1>", cart));
  } catch (e) {
    console.error(e);
    send(res, 500, page("Error", "<h1>Something went wrong</h1>", cart));
  }
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  server.listen(PORT, HOST, () => console.log(`Northwind Goods demo store on http://${HOST}:${PORT}`));
}
