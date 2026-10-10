/**
 * Annzar Voice Shop MCP Server
 *
 * SDK:  @modelcontextprotocol/sdk v1.x (maintenance line)
 * Spec: MCP 2025-11-25
 * Transport: Streamable HTTP (POST + GET /mcp)
 */
import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { randomUUID } from 'node:crypto'

import { MockShopAdapter }   from './adapters/MockShopAdapter.js'
import { AnnzarShopAdapter } from './adapters/AnnzarShopAdapter.js'
import { JsonFileMemoryStore } from './memory/JsonFileMemoryStore.js'
import { registerTools }     from './tools/registerTools.js'
import type { ShopAdapter }  from './adapters/ShopAdapter.js'

// ── Config ────────────────────────────────────────────────────────────────────
const PORT        = Number(process.env.PORT ?? 3000)
const MCP_API_KEY = process.env.MCP_API_KEY ?? ''
const ADAPTER_ENV = (process.env.SHOP_ADAPTER ?? 'mock').toLowerCase()

if (!MCP_API_KEY) {
  console.warn('⚠️  MCP_API_KEY is not set. All /mcp requests will be rejected with 401.')
}

// ── Adapter selection ─────────────────────────────────────────────────────────
const adapter: ShopAdapter =
  ADAPTER_ENV === 'annzar' ? new AnnzarShopAdapter() : new MockShopAdapter()

console.log(`📦  Shop adapter: ${ADAPTER_ENV}`)

// ── Memory ────────────────────────────────────────────────────────────────────
const memory = new JsonFileMemoryStore('./data/memory.json')

// ── MCP server (one instance, reused across all sessions) ─────────────────────
// Per the 2025-11-25 spec, with Streamable HTTP the server instance is shared;
// session state lives in the transport layer.
const mcpServer = new McpServer({
  name:    'annzar-voice-shop',
  version: '0.1.0',
})

registerTools(mcpServer, adapter, memory)

// ── Session transport map ─────────────────────────────────────────────────────
const transports = new Map<string, StreamableHTTPServerTransport>()

// ── Express ───────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())

// /health — public, no auth required
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'ok',
    adapter:   ADAPTER_ENV,
    sdk:       '@modelcontextprotocol/sdk',
    spec:      '2025-11-25',
    transport: 'streamable-http',
  })
})

// Bearer token auth middleware — applied to /mcp only
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_API_KEY) {
    res.status(401).json({ error: 'MCP_API_KEY not configured on server' })
    return
  }
  const auth = req.headers.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (token !== MCP_API_KEY) {
    res.status(401).json({ error: 'Invalid or missing API key. Send Authorization: Bearer <key>' })
    return
  }
  next()
}

// /mcp — Streamable HTTP transport endpoint
// POST: new messages / initialize
// GET:  SSE stream for server-initiated messages
app.post('/mcp', requireApiKey, async (req: Request, res: Response) => {
  // Session ID: reuse from header (client reconnecting) or generate new
  const sessionId = (req.headers['mcp-session-id'] as string | undefined) ?? randomUUID()

  let transport = transports.get(sessionId)
  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (sid) => {
        transports.set(sid, transport!)
      },
    })
    // Clean up on close
    transport.onclose = () => { transports.delete(sessionId) }
    await mcpServer.connect(transport)
  }

  await transport.handleRequest(req, res, req.body)
})

app.get('/mcp', requireApiKey, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: 'No active session. POST to /mcp first to initialize.' })
    return
  }
  await transports.get(sessionId)!.handleRequest(req, res)
})

app.delete('/mcp', requireApiKey, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports.has(sessionId)) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const t = transports.get(sessionId)!
  await t.handleRequest(req, res)
  transports.delete(sessionId)
})

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Annzar Voice Shop MCP server running`)
  console.log(`   Health:  http://localhost:${PORT}/health`)
  console.log(`   MCP:     http://localhost:${PORT}/mcp`)
  console.log(`   Auth:    Authorization: Bearer <MCP_API_KEY>`)
  console.log(`\n   Run "npm run inspect" for testing instructions.\n`)
})

export { app }
