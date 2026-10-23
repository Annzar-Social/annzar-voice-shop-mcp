/**
 * Annzar Voice Shop MCP Server
 *
 * SDK:  @modelcontextprotocol/sdk@1.32.1 (v1 maintenance line)
 * Spec: MCP 2025-11-25
 *   Proof: node_modules/@modelcontextprotocol/sdk/dist/esm/types.js line 2:
 *     export const LATEST_PROTOCOL_VERSION = '2025-11-25';
 *   Supported: ['2025-11-25','2025-06-18','2025-03-26','2024-11-05','2024-10-07']
 * Transport: Streamable HTTP (POST + GET /mcp)
 */
import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'

import { MockShopAdapter, findMockProduct } from './adapters/MockShopAdapter.js'
import { AnnzarShopAdapter }   from './adapters/AnnzarShopAdapter.js'
import { JsonFileMemoryStore } from './memory/JsonFileMemoryStore.js'
import { registerTools }       from './tools/registerTools.js'
import { createDemoRateLimiter, parseDemoIntent } from './demo.js'
import { demoPage } from './demoPage.js'
import { renderDemoCheckoutPage } from './demoCheckoutPage.js'
import type { ShopAdapter }    from './adapters/ShopAdapter.js'

// ── Config ────────────────────────────────────────────────────────────────────
const PORT        = Number(process.env.PORT ?? 3000)
const MCP_API_KEY = process.env.MCP_API_KEY ?? ''
const ADAPTER_ENV = (process.env.SHOP_ADAPTER ?? 'mock').toLowerCase()
const MEMORY_PATH = process.env.MEMORY_PATH ?? './data/memory.json'

// Startup log — adapter + protocol version. Never prints secrets.
console.log('='.repeat(60))
console.log('  Annzar Voice Shop MCP Server')
console.log(`  Adapter:     ${ADAPTER_ENV}`)
console.log(`  MCP spec:    ${LATEST_PROTOCOL_VERSION}`)
console.log(`  Transport:   Streamable HTTP`)
console.log(`  Memory:      ${MEMORY_PATH}`)
console.log(`  Port:        ${PORT}`)
console.log(`  API key set: ${MCP_API_KEY ? 'yes' : 'NO — requests will be rejected'}`)
console.log('='.repeat(60))

// ── Adapter ───────────────────────────────────────────────────────────────────
const adapter: ShopAdapter =
  ADAPTER_ENV === 'annzar' ? new AnnzarShopAdapter() : new MockShopAdapter()

// ── Memory (path from env; starts cleanly if file absent) ────────────────────
const memory = new JsonFileMemoryStore(MEMORY_PATH)

// ── MCP server ────────────────────────────────────────────────────────────────
function createMcpServer(toolAdapter: ShopAdapter = adapter): McpServer {
  const server = new McpServer({ name: 'annzar-voice-shop', version: '0.1.0' })
  registerTools(server, toolAdapter, memory)
  return server
}

// ── Session map ───────────────────────────────────────────────────────────────
const transports = new Map<string, StreamableHTTPServerTransport>()

// ── Express ───────────────────────────────────────────────────────────────────
const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '2kb' }))

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', adapter: ADAPTER_ENV, sdk: '@modelcontextprotocol/sdk@1.32.1', spec: LATEST_PROTOCOL_VERSION, transport: 'streamable-http' })
})

app.get('/demo', (_req: Request, res: Response) => {
  res.status(200).type('html').send(demoPage)
})

app.get('/demo-checkout/:id', (req: Request, res: Response) => {
  const id = req.params.id
  if (!/^prod_[0-9]{3}$/.test(id)) { res.status(404).type('text').send('Not found'); return }
  res.status(200).type('html').send(renderDemoCheckoutPage(findMockProduct(id)))
})

const demoRateLimit = createDemoRateLimiter()
const demoProducts = new Map<string, string>()
app.post('/api/demo/command', demoRateLimit, async (req: Request, res: Response) => {
  if (!req.is('application/json')) { res.status(415).json({ error: 'Content-Type must be application/json' }); return }
  const { sentence, sessionId } = req.body ?? {}
  if (typeof sentence !== 'string' || !sentence.trim() || sentence.length > 500 || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
    res.status(400).json({ error: 'Provide a sentence (up to 500 characters) and a valid sessionId.' }); return
  }
  const intent = parseDemoIntent(sentence)
  if (intent.tool === 'help') {
    res.json({ reply: 'I can summarize sales, find products, create a product, draft a post, get a checkout link, or tell you what I remember.' }); return
  }
  const priorProduct = demoProducts.get(sessionId)
  let tool: string = intent.tool
  let args: Record<string, unknown> = {}
  if (intent.tool === 'get_shop_summary' || intent.tool === 'search_products') args = intent.arguments
  else if (intent.tool === 'create_product') args = { ...intent.arguments, description: 'Freshly added for your shop.', category: 'Demo', confirm: true }
  else if (intent.tool === 'draft_post' || intent.tool === 'get_checkout_link') {
    if (!priorProduct) { res.json({ reply: 'First find a product or create one in this conversation, then ask me to draft a post or get its checkout link.' }); return }
    args = intent.tool === 'draft_post' ? { product_id: priorProduct, platform: 'pulse' } : { product_id: priorProduct }
  }
  if (!MCP_API_KEY) { res.status(503).json({ error: 'Demo is temporarily unavailable.' }); return }
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${MCP_API_KEY}`, 'X-Demo-Request': '1' } },
  })
  const client = new Client({ name: 'voice-shop-demo', version: '1.0.0' })
  try {
    await client.connect(transport)
    const result = await client.callTool({ name: tool, arguments: args }) as { content?: Array<{ type: string; text?: string }> }
    const raw = result.content?.find((part) => part.type === 'text')
    const data = raw?.type === 'text' && raw.text ? JSON.parse(raw.text) as Record<string, any> : undefined
    if (data?.product?.id) demoProducts.set(sessionId, data.product.id)
    if (data?.products?.[0]?.id) demoProducts.set(sessionId, data.products[0].id)
    while (demoProducts.size > 1000) demoProducts.delete(demoProducts.keys().next().value as string)
    const reply = data?.summary_text ?? data?.message ?? data?.caption ?? (data?.url ? 'Here is your demo checkout link.' : data?.products ? `I found ${data.count} matching product(s).` : data?.lastAction !== undefined ? 'Here is what I remember about this shop.' : 'Done.')
    res.json({ reply, tool, data })
  } catch (error) {
    console.error('Demo MCP request failed:', error instanceof Error ? error.message : 'unknown error')
    res.status(502).json({ error: 'The shop assistant could not complete that request. Please try again.' })
  } finally {
    await client.close().catch(() => undefined)
  }
})

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_API_KEY) { res.status(401).json({ error: 'MCP_API_KEY not configured' }); return }
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim()
  if (token !== MCP_API_KEY) { res.status(401).json({ error: 'Invalid or missing API key' }); return }
  next()
}

app.post('/mcp', requireApiKey, async (req: Request, res: Response) => {
  const sessionId = (req.headers['mcp-session-id'] as string | undefined) ?? randomUUID()
  let transport = transports.get(sessionId)
  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator:   () => sessionId,
      onsessioninitialized: (sid) => { transports.set(sid, transport!) },
    })
    transport.onclose = () => { transports.delete(sessionId) }
    const toolAdapter = req.headers['x-demo-request'] === '1' ? new MockShopAdapter() : adapter
    await createMcpServer(toolAdapter).connect(transport)
  }
  await transport.handleRequest(req, res, req.body)
})

app.get('/mcp', requireApiKey, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports.has(sessionId)) { res.status(400).json({ error: 'No active session. POST /mcp first.' }); return }
  await transports.get(sessionId)!.handleRequest(req, res)
})

app.delete('/mcp', requireApiKey, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports.has(sessionId)) { res.status(404).json({ error: 'Session not found' }); return }
  const t = transports.get(sessionId)!
  await t.handleRequest(req, res)
  transports.delete(sessionId)
})

// Only start listening when this module is the entrypoint (not when imported by tests)
if (process.env.MCP_TEST_MODE !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀  http://localhost:${PORT}/health  (public)`)
    console.log(`    http://localhost:${PORT}/mcp      (Bearer token)\n`)
  })
}

export { app }
