# annzar-voice-shop-mcp

**Amazon Developer Hackathon 2026 — Alexa+ track**

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets an AI assistant (Alexa+) run a small digital shop by voice. Sellers can check revenue, search products, create listings, draft social posts, and share checkout links — all through natural speech.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Alexa+ / AI Client                                          │
│  (or any MCP host: Claude, VS Code, MCP Inspector)           │
└─────────────────────────┬────────────────────────────────────┘
                          │  Streamable HTTP  (POST/GET /mcp)
                          │  Authorization: Bearer <MCP_API_KEY>
┌─────────────────────────▼────────────────────────────────────┐
│  Express HTTP Server  (src/server.ts)                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  McpServer  (@modelcontextprotocol/sdk v1.x)          │    │
│  │  Spec: MCP 2025-11-25                                 │    │
│  │                                                       │    │
│  │  Tools:                                               │    │
│  │    get_shop_summary   search_products                 │    │
│  │    create_product     draft_post                      │    │
│  │    get_checkout_link  get_context                     │    │
│  └──────────────┬──────────────────────────┬────────────┘    │
│                 │                          │                  │
│  ┌──────────────▼──────────┐  ┌────────────▼─────────────┐  │
│  │  ShopAdapter (interface) │  │  MemoryStore (interface)  │  │
│  │  ┌───────────────────┐  │  │  ┌─────────────────────┐  │  │
│  │  │ MockShopAdapter   │  │  │  │ SqliteMemoryStore   │  │  │
│  │  │ (demo data)       │  │  │  │ (better-sqlite3)    │  │  │
│  │  ├───────────────────┤  │  │  ├─────────────────────┤  │  │
│  │  │ AnnzarShopAdapter │  │  │  │ InMemoryStore       │  │  │
│  │  │ (stub — todo)     │  │  │  │ (tests)             │  │  │
│  │  └───────────────────┘  │  │  └─────────────────────┘  │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup

```bash
# 1. Clone
git clone https://github.com/Annzar-Social/annzar-voice-shop-mcp.git
cd annzar-voice-shop-mcp

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env — set MCP_API_KEY to any strong random string

# 4. Run (development, auto-reload)
npm run dev

# 5. Run (production)
npm run build && npm start
```

---

## Environment variables

| Variable       | Required | Default  | Description                                                   |
|----------------|----------|----------|---------------------------------------------------------------|
| `MCP_API_KEY`  | ✅ yes   | —        | Bearer token required on every `/mcp` request                 |
| `SHOP_ADAPTER` | no       | `mock`   | `mock` (demo data) or `annzar` (real platform — stub today)   |
| `PORT`         | no       | `3000`   | HTTP port                                                     |

---

## Running

```bash
# Development (hot-reload via tsx watch)
npm run dev

# Check the server is alive
curl http://localhost:3000/health

# List all tools (replace <key> with your MCP_API_KEY)
curl -s -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq .
```

---

## Tests

```bash
npm test
# Runs vitest across src/tests/ — covers all 6 tools, both adapters, memory store, and auth logic
```

---

## MCP Inspector

```bash
npm run inspect
# Prints the exact commands to open the MCP Inspector UI
```

Then run:
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp \
  --header "Authorization: Bearer <your-MCP_API_KEY>"
```

---

## Tool reference

### `get_shop_summary`
Returns revenue, orders, top product, and period-over-period comparison.

```json
{ "period": "week" }
```
→
```json
{
  "period": "week",
  "revenue_usd": 487,
  "orders": 15,
  "top_product": "Minimal UI Kit",
  "revenue_change": "+23%",
  "orders_change": "+15%",
  "summary_text": "In the week, you made $487 across 15 orders..."
}
```

---

### `search_products`
Full-text + optional filter search across the catalog.

```json
{ "query": "design", "max_price": 30, "category": "Design" }
```

---

### `create_product`
Confirm gate — `confirm: false` returns a preview, `confirm: true` saves.

```json
{ "name": "Icon Set v2", "price": 19, "description": "500 icons", "category": "Design", "confirm": false }
```

---

### `draft_post`
Generates a promotional caption. **Does NOT post anywhere.**

```json
{ "product_id": "prod_001", "platform": "pulse" }
```

---

### `get_checkout_link`
Returns a purchase URL for the product.

```json
{ "product_id": "prod_001" }
```

---

### `get_context`
Returns session memory (last action, last product, language/tone preference, recent queries).

```json
{}
```

---

## SDK and spec versions

| Item                | Value                                    |
|---------------------|------------------------------------------|
| SDK package         | `@modelcontextprotocol/sdk`              |
| SDK version         | `^1.12.0` (v1 maintenance line)          |
| MCP spec            | `2025-11-25`                             |
| Transport           | Streamable HTTP (`StreamableHTTPServerTransport`) |
| Verification        | SDK v1.x docs at ts.sdk.modelcontextprotocol.io explicitly state it implements the 2025-11-25 spec; search results confirm `1.29.x` as the latest v1 release at hackathon time. |

---

## Adapter extension guide

To connect real Annzar endpoints, implement each method in `src/adapters/AnnzarShopAdapter.ts`.
Set `SHOP_ADAPTER=annzar` in `.env`. No other changes are needed — the MCP tools are adapter-agnostic.

---

## License

MIT — see LICENSE.
