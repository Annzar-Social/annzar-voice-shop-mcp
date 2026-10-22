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
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'

import { MockShopAdapter }     from './adapters/MockShopAdapter.js'
import { AnnzarShopAdapter }   from './adapters/AnnzarShopAdapter.js'
import { JsonFileMemoryStore } from './memory/JsonFileMemoryStore.js'
import { registerTools }       from './tools/registerTools.js'
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
const mcpServer = new McpServer({ name: 'annzar-voice-shop', version: '0.1.0' })
registerTools(mcpServer, adapter, memory)

// ── Session map ───────────────────────────────────────────────────────────────
const transports = new Map<string, StreamableHTTPServerTransport>()

// ── Express ───────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', adapter: ADAPTER_ENV, sdk: '@modelcontextprotocol/sdk@1.32.1', spec: LATEST_PROTOCOL_VERSION, transport: 'streamable-http' })
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
    await mcpServer.connect(transport)
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
