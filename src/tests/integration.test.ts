/**
 * Integration tests — starts the real server, hits real HTTP endpoints.
 * Covers items 4b-4f from the requirements:
 *   4b) POST /mcp with no token -> 401
 *   4c) POST /mcp with wrong token -> 401
 *   4d) initialize with valid token -> shows protocolVersion
 *   4e) tools/list -> all 6 tool names present
 *   4f) tools/call get_shop_summary period:week -> revenue > 0
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'

// Set env before importing server so dotenv doesn't override these
process.env.MCP_API_KEY   = 'integration-test-key'
process.env.SHOP_ADAPTER  = 'mock'
process.env.MEMORY_PATH   = '/tmp/integration-test-memory.json'
process.env.MCP_TEST_MODE = '1'   // prevent server.ts from calling app.listen(PORT)

// Dynamically import so env vars are set first
const { app } = await import('../server.js')

let server: Server
let base: string
let sessionId: string

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      base = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(() => { server?.close() })

// ── helpers ───────────────────────────────────────────────────────────────────
const HEADERS_NO_AUTH  = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }
const HEADERS_WRONG    = { ...HEADERS_NO_AUTH, 'Authorization': 'Bearer wrong-key' }
const HEADERS_VALID    = { ...HEADERS_NO_AUTH, 'Authorization': 'Bearer integration-test-key' }

function jsonrpc(method: string, params: unknown, id: number) {
  return JSON.stringify({ jsonrpc: '2.0', method, params, id })
}

describe('proxy-aware demo rate limit', () => {
  it('trusts one proxy hop and maintains separate 20/minute limits per forwarded client IP', async () => {
    expect(app.get('trust proxy')).toBe(1)
    const request = (ip: string) => fetch(`${base}/api/demo/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ sentence: 'hello', sessionId: 'proxy-test' }),
    })
    let response: Response | undefined
    for (let i = 0; i < 20; i++) response = await request('198.51.100.31')
    expect(response?.status).toBe(200)
    expect((await request('198.51.100.31')).status).toBe(429)
    expect((await request('198.51.100.32')).status).toBe(200)
  })
})

// 4a) GET /health — public, no token needed
describe('4a) GET /health (public)', () => {
  it('returns 200 with status ok', async () => {
    const r = await fetch(`${base}/health`)
    expect(r.status).toBe(200)
    const body = await r.json() as Record<string, unknown>
    expect(body.status).toBe('ok')
    expect(body.spec).toBe('2025-11-25')
  })
})

// 4b) POST /mcp with no token -> 401
describe('4b) POST /mcp no token -> 401', () => {
  it('rejects with 401', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: HEADERS_NO_AUTH, body: jsonrpc('tools/list', {}, 1) })
    expect(r.status).toBe(401)
  })
})

// 4c) POST /mcp with wrong token -> 401
describe('4c) POST /mcp wrong token -> 401', () => {
  it('rejects with 401', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: HEADERS_WRONG, body: jsonrpc('tools/list', {}, 1) })
    expect(r.status).toBe(401)
  })
})

// 4d) initialize with valid token -> protocolVersion = 2025-11-25
describe('4d) initialize with valid token', () => {
  it('returns protocolVersion 2025-11-25', async () => {
    const r = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: HEADERS_VALID,
      body: jsonrpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '0' } }, 1),
    })
    expect(r.status).toBe(200)
    sessionId = r.headers.get('mcp-session-id') ?? ''
    const text = await r.text()
    // Response is either JSON or SSE; parse first JSON object
    const line  = text.split('\n').find(l => l.startsWith('data:') || l.startsWith('{'))
    const json  = line ? JSON.parse(line.replace(/^data:\s*/, '')) : JSON.parse(text)
    expect(json.result?.protocolVersion).toBe('2025-11-25')
    expect(json.result?.serverInfo?.name).toBe('annzar-voice-shop')
  })
})

// 4e) tools/list -> all 6 tool names
describe('4e) tools/list -> 6 tools', () => {
  it('returns all 6 registered tools', async () => {
    const headers = sessionId
      ? { ...HEADERS_VALID, 'mcp-session-id': sessionId }
      : HEADERS_VALID
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers, body: jsonrpc('tools/list', {}, 2) })
    expect(r.status).toBe(200)
    const text = await r.text()
    const line = text.split('\n').find(l => l.startsWith('data:') || l.startsWith('{'))
    const json = line ? JSON.parse(line.replace(/^data:\s*/, '')) : JSON.parse(text)
    const names: string[] = (json.result?.tools ?? []).map((t: { name: string }) => t.name)
    expect(names).toContain('get_shop_summary')
    expect(names).toContain('search_products')
    expect(names).toContain('create_product')
    expect(names).toContain('draft_post')
    expect(names).toContain('get_checkout_link')
    expect(names).toContain('get_context')
    expect(names.length).toBe(6)
  })
})

// 4f) tools/call get_shop_summary period:week -> revenue > 0
describe('4f) tools/call get_shop_summary week', () => {
  it('returns revenue > 0 for the week', async () => {
    const headers = sessionId
      ? { ...HEADERS_VALID, 'mcp-session-id': sessionId }
      : HEADERS_VALID
    const r = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: jsonrpc('tools/call', { name: 'get_shop_summary', arguments: { period: 'week' } }, 3),
    })
    expect(r.status).toBe(200)
    const text = await r.text()
    const line = text.split('\n').find(l => l.startsWith('data:') || l.startsWith('{'))
    const json = line ? JSON.parse(line.replace(/^data:\s*/, '')) : JSON.parse(text)
    const content = json.result?.content?.[0]?.text ?? ''
    const payload = JSON.parse(content)
    expect(payload.revenue_usd).toBeGreaterThan(0)
    expect(payload.orders).toBeGreaterThan(0)
    expect(payload.period).toBe('week')
  })
})
