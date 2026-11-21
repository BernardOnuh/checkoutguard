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
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{--ink:#18181b;--mute:#71717a;--line:#ececee;--bg:#f7f6f3;--brand:#f97316;--brand-2:#ea580c}
  *{box-sizing:border-box} body{margin:0;font:16px/1.55 "Plus Jakarta Sans",system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
  header{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.85);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--line)}
  .wrap{max-width:1040px;margin:0 auto;padding:0 22px}
  header .wrap{display:flex;justify-content:space-between;align-items:center;height:68px}
  header a{color:var(--ink);text-decoration:none;font-weight:800;letter-spacing:-.01em}
  .brand{display:flex;align-items:center;gap:10px;font-size:19px} .brand i{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#fb923c,#ea580c);font-style:normal;color:#fff;font-size:17px;box-shadow:0 6px 16px -6px rgba(234,88,12,.7)}
  .cart-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:999px;background:var(--ink);color:#fff!important;font-size:14px}
  main.wrap{padding-top:44px;padding-bottom:80px} h1{margin:0 0 6px;font-size:34px;letter-spacing:-.03em} .lead{margin:0 0 28px;color:var(--mute)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
  .card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 1px 2px rgba(24,24,27,.04),0 12px 32px -20px rgba(24,24,27,.18)}
  .product{display:flex;flex-direction:column;gap:6px;transition:transform .15s ease,box-shadow .15s ease} .product:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px rgba(24,24,27,.35)}
  .emoji{display:grid;place-items:center;height:150px;margin:-6px -6px 10px;border-radius:14px;font-size:64px;background:linear-gradient(145deg,#fff7ed,#ffedd5)}
  .product:nth-child(2) .emoji{background:linear-gradient(145deg,#f0fdf4,#dcfce7)} .product:nth-child(3) .emoji{background:linear-gradient(145deg,#eff6ff,#dbeafe)} .product:nth-child(4) .emoji{background:linear-gradient(145deg,#faf5ff,#ede9fe)}
  .product h3{margin:0;font-size:17px} .price{margin:0 0 10px;font-weight:800;font-size:18px}
  button,.btn{background:var(--ink);color:#fff;border:0;border-radius:12px;padding:12px 18px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .15s,transform .05s}
  button:hover,.btn:hover{background:#000} button:active{transform:translateY(1px)} .product button{width:100%}
  .primary{background:linear-gradient(135deg,#fb923c,#ea580c)} .primary:hover{background:linear-gradient(135deg,#f97316,#c2410c)}
  .ghost{background:#fff;color:var(--ink);border:1px solid var(--line)} .ghost:hover{background:#fafafa}
  input{font:inherit;padding:12px 14px;border:1px solid #e4e4e7;border-radius:12px;width:100%;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s} input:focus{border-color:var(--brand);box-shadow:0 0 0 4px rgba(249,115,22,.15)}
  table{width:100%;border-collapse:collapse} td,th{padding:14px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle} th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);font-weight:700} tr:last-child td{border-bottom:0} .r{text-align:right}
  .totals{margin-top:18px} .totals div{display:flex;justify-content:space-between;padding:6px 0;color:#3f3f46}
  .grand{font-size:22px;font-weight:800;color:var(--ink)!important;border-top:1px dashed #d4d4d8;margin-top:8px;padding-top:14px!important}
  .msg{padding:12px 16px;border-radius:12px;margin:14px 0;font-weight:600} .err{background:#fef2f2;color:#b91c1c} .ok{background:#f0fdf4;color:#15803d}
  label{display:block;font-weight:700;font-size:14px;margin:16px 0 6px} label small{font-weight:500;color:var(--mute)} .row{display:flex;gap:10px;align-items:center}
  .stack{display:grid;gap:18px} @media(min-width:860px){.split{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start}}
</style></head><body>
<header><div class="wrap"><a href="/" class="brand"><i>N</i>Northwind Goods</a><a href="/cart" class="cart-pill" data-testid="cart-link">🛒 Cart (${count})</a></div></header>
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
const shop = cart => page("Shop", `<h1>Everyday goods, made well</h1><p class="lead">Free shipping on orders over $100. Use code SAVE10 for 10% off.</p><div class="grid">${PRODUCTS.map(p => `
  <div class="card product" data-testid="product-${p.id}"><div class="emoji">${p.emoji}</div><h3>${esc(p.name)}</h3><p class="price">${money(p.priceCents)}</p>
  <form method="post" action="/cart/add"><input type="hidden" name="productId" value="${p.id}"><button type="submit" class="primary">Add to cart</button></form></div>`).join("")}</div>`, cart);

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
  ${totalsHtml(q, cart.coupon)}<p style="margin-top:18px"><a class="btn primary" style="width:100%" href="/checkout" data-testid="go-checkout">Checkout →</a></p></div>`, cart);
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
    <p style="margin-top:22px"><button type="submit" class="primary" style="width:100%" data-testid="place-order">Place order · ${money(q.totalCents)}</button></p>
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
