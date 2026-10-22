# annzar-voice-shop-mcp

**Amazon Developer Hackathon 2026 — Alexa+ track**

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets an AI assistant run a small digital shop by voice. Sellers can check revenue, find products, create listings, draft social posts, and get checkout links — entirely through natural speech.

---

## SDK and protocol version (verified)

| Item | Value |
|---|---|
| Package | `@modelcontextprotocol/sdk@1.32.1` |
| MCP spec | **2025-11-25** |
| Transport | Streamable HTTP |

**Proof** — exact lines from the installed SDK source:

```
node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
  line 2: export const LATEST_PROTOCOL_VERSION = '2025-11-25';
  line 4: export const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
```

`2025-11-25` is both `LATEST_PROTOCOL_VERSION` and present in `SUPPORTED_PROTOCOL_VERSIONS`. Verified by reading the file directly, not by trusting documentation.

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Alexa+ / any MCP host (Claude, VS Code, MCP Inspector)       │
└──────────────────────────┬────────────────────────────────────┘
                           │  Streamable HTTP  POST/GET /mcp
                           │  Authorization: Bearer <MCP_API_KEY>
┌──────────────────────────▼────────────────────────────────────┐
│  Express server  (src/server.ts)                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  McpServer  (SDK 1.32.1, spec 2025-11-25)               │  │
│  │  Tools: get_shop_summary · search_products              │  │
│  │          create_product  · draft_post                   │  │
│  │          get_checkout_link · get_context                │  │
│  └──────────────┬───────────────────────┬─────────────────┘  │
│                 │                       │                     │
│  ┌──────────────▼───────────┐ ┌─────────▼──────────────────┐ │
│  │ ShopAdapter (interface)  │ │ MemoryStore (interface)     │ │
│  │  MockShopAdapter ✅      │ │  JsonFileMemoryStore ✅     │ │
│  │  AnnzarShopAdapter stub  │ │  InMemoryStore (tests)     │ │
│  └──────────────────────────┘ └────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Setup

```bash
git clone https://github.com/Annzar-Social/annzar-voice-shop-mcp.git
cd annzar-voice-shop-mcp
npm ci
cp .env.example .env        # edit: set MCP_API_KEY
npm run build               # tsc → dist/
npm start                   # node dist/server.js
```

---

## Environment variables

| Variable       | Required | Default              | Description                                        |
|----------------|----------|----------------------|----------------------------------------------------|
| `MCP_API_KEY`  | ✅ yes   | —                    | Bearer token for `/mcp` — never commit a real value |
| `SHOP_ADAPTER` | no       | `mock`               | `mock` (demo data) or `annzar` (stub)              |
| `PORT`         | no       | `3000`               | HTTP port (Render sets this automatically)         |
| `MEMORY_PATH`  | no       | `./data/memory.json` | JSON memory file path (`/tmp/...` for Render)      |

---

## Scripts

```bash
npm run build       # tsc — Render build command
npm start           # node dist/server.js — Render start command
npm run dev         # tsx watch (hot-reload for development)
npm test            # unit tests (28 tests, no server needed)
npm run test:integration  # integration tests against real server
npm run test:all    # both test suites
npm run typecheck   # tsc --noEmit (may be slow locally — see FRICTION_LOG)
npm run inspect     # prints MCP Inspector command
```

---

## Tools

| Tool | Description |
|---|---|
| `get_shop_summary` | Revenue, orders, top product, period-over-period comparison |
| `search_products` | Full-text + max_price + category filters |
| `create_product` | `confirm:false` = preview, `confirm:true` = save |
| `draft_post` | Promotional caption for `pulse` or `flow` — **does not post** |
| `get_checkout_link` | Purchase URL for a product |
| `get_context` | What the assistant remembers about this seller |

## Try the demo

Open the [Voice Shop Assistant simulator](https://annzar-voice-shop-mcp.onrender.com/demo) on a phone or desktop. Speak with the microphone in a browser that supports the Web Speech API, or type a request instead. The simulator uses mock shop data and can summarize sales, search products, create a demo product, draft a promotional post, retrieve a checkout link, and show remembered context. It does not publish posts or place orders.

### Example calls

```bash
KEY=your-key
PORT=3000

# Health (no auth)
curl http://localhost:$PORT/health

# Initialize
curl -s -X POST http://localhost:$PORT/mcp \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"0"}},"id":1}'

# List tools
curl -s -X POST http://localhost:$PORT/mcp \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'

# Call get_shop_summary
curl -s -X POST http://localhost:$PORT/mcp \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_shop_summary","arguments":{"period":"week"}},"id":3}'
```

---

## Deploy to Render

### Steps

1. Fork or push this repo to your GitHub account.
2. Go to [render.com](https://render.com) → **New** → **Web Service**.
3. Connect your GitHub repo.
4. Render auto-detects `render.yaml` — review the settings:
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Node version:** `20.18.0` (set via `NODE_VERSION` env var)
5. Under **Environment Variables**, set:
   - `MCP_API_KEY` → a strong random string (e.g. `openssl rand -hex 32`)
   - `SHOP_ADAPTER` → `mock` (for demo) or `annzar` (when real adapter is ready)
   - `MEMORY_PATH` is pre-set to `/tmp/memory.json` in `render.yaml` — leave it.
6. Click **Deploy**. Watch the build log for the startup banner showing adapter and MCP spec version.
7. Test the deployed service:

```bash
# Health check (no token)
curl https://<your-service>.onrender.com/health

# MCP call (with your key)
curl -s -X POST https://<your-service>.onrender.com/mcp \
  -H "Authorization: Bearer <your-MCP_API_KEY>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

> **Note:** Render free tier has ephemeral disk — `MEMORY_PATH=/tmp/memory.json` means seller context resets on each deploy or restart. This is fine for demo purposes; use a paid plan with a persistent disk for production.

---

## Adapter extension guide

To connect real Annzar endpoints, implement each method in `src/adapters/AnnzarShopAdapter.ts` and set `SHOP_ADAPTER=annzar`. The MCP tools are adapter-agnostic — no other changes needed.

---

## License

MIT — see LICENSE.
