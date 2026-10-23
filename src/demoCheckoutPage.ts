import type { Product } from './adapters/ShopAdapter.js'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

export function renderDemoCheckoutPage(product?: Product): string {
  const details = product
    ? `<section class="product" aria-label="Mock product"><h2>${escapeHtml(product.name)}</h2><div class="category">${escapeHtml(product.category)}</div><div class="price">$${escapeHtml(product.price.toFixed(2))}</div></section>`
    : '<section class="product" aria-label="Mock product"><h2>Demo product</h2><p class="category">This product is not in the mock catalog.</p></section>'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Demo checkout (mock shop)</title>
<style>
:root{color-scheme:dark;--bg:#08090a;--panel:#111214;--line:#292a2d;--text:#f2f2f1;--muted:#a4a5a8}*{box-sizing:border-box}body{min-height:100vh;margin:0;padding:26px 16px;display:grid;place-items:center;background:radial-gradient(ellipse at 50% -25%,#202124 0,transparent 56%),var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.panel{width:min(100%,520px);padding:clamp(22px,6vw,36px);border:1px solid var(--line);border-radius:18px;background:linear-gradient(155deg,#131416,#101113 72%);box-shadow:0 18px 55px #0007}.eyebrow{margin:0 0 9px;color:#999a9d;font-size:10px;letter-spacing:.16em;text-transform:uppercase}h1{margin:0;font-size:clamp(26px,6vw,34px);line-height:1.15;letter-spacing:-.045em}.intro{margin:9px 0 25px;color:var(--muted);font-size:13px}.product{padding:17px;border:1px solid #343539;border-radius:13px;background:#0d0e10}h2{margin:0;color:#f1f1ef;font-size:19px;line-height:1.3;overflow-wrap:anywhere}.category{margin-top:5px;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.price{margin-top:17px;padding-top:13px;border-top:1px solid #292a2d;color:#f4f4f2;font-size:25px;font-weight:700;font-variant-numeric:tabular-nums}.notice{margin:18px 0 0;padding:13px 14px;border:1px solid #303135;border-radius:11px;background:#151619;color:#dededc;font-size:12px}.back{display:inline-flex;margin-top:19px;color:#efefed;font-size:12px;font-weight:650;text-underline-offset:4px}.back:focus-visible{outline:2px solid #dededc;outline-offset:4px;border-radius:2px}@media(max-width:420px){body{padding:16px 12px}.panel{border-radius:15px}}
</style>
</head>
<body>
<main class="panel">
  <p class="eyebrow">Annzar Voice Shop · Mock environment</p>
  <h1>Demo checkout (mock shop)</h1>
  <p class="intro">Review the item from your voice-shop demo.</p>
  ${details}
  <p class="notice">This is a demo checkout page. No payment is taken. With the real Annzar adapter this link points to the product's real checkout.</p>
  <a class="back" href="/demo">Back to the demo</a>
</main>
</body>
</html>`
}
