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

import { MockShopAdapter }     from './adapters/MockShopAdapter.js'
import { AnnzarShopAdapter }   from './adapters/AnnzarShopAdapter.js'
import { JsonFileMemoryStore } from './memory/JsonFileMemoryStore.js'
import { registerTools }       from './tools/registerTools.js'
import { createDemoRateLimiter, parseDemoIntent } from './demo.js'
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

const demoPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voice Shop Assistant (simulator)</title>
<style>
:root{color-scheme:light;--ink:#18211f;--muted:#64716d;--green:#146b55;--pale:#edf5f1;--line:#dce6e1}*{box-sizing:border-box}body{margin:0;background:#f5f8f6;color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:760px;margin:0 auto;padding:32px 18px 56px}.panel{background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(20px,5vw,38px);box-shadow:0 12px 40px #163c2c0c}h1{font-size:clamp(26px,6vw,38px);line-height:1.12;margin:0 0 8px;letter-spacing:-.04em}.sub{color:var(--muted);margin:0 0 28px}.mic-area{display:flex;justify-content:center;margin:24px 0 12px}.mic{width:88px;height:88px;border:0;border-radius:50%;background:var(--green);color:white;font-size:30px;cursor:pointer;box-shadow:0 8px 20px #146b5533}.mic[aria-pressed=true]{background:#b33d42;animation:pulse 1s infinite}@keyframes pulse{50%{box-shadow:0 0 0 12px #b33d4222}}.hint{text-align:center;color:var(--muted);font-size:14px;margin:0 0 22px}.form{display:flex;gap:10px}.form input{min-width:0;flex:1;border:1px solid var(--line);border-radius:12px;padding:13px 14px;font:inherit}.form button{border:0;border-radius:12px;background:#20332d;color:white;padding:0 20px;font:inherit;font-weight:650;cursor:pointer}.conversation{margin-top:26px;display:grid;gap:14px}.msg{padding:14px 16px;border-radius:14px;max-width:92%;white-space:pre-wrap}.user{background:var(--pale);justify-self:end}.assistant{background:#f5f6f5;border:1px solid var(--line)}.card{margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 15px}.card h3{font-size:15px;margin:0 0 7px}.card p{margin:4px 0}.card .note{font-size:12px;color:var(--muted)}.product{display:flex;justify-content:space-between;gap:12px}.price{font-weight:700;color:var(--green)}a{color:var(--green);overflow-wrap:anywhere}.status{text-align:center;min-height:22px;color:var(--muted);font-size:13px;margin-top:10px}@media(max-width:480px){.wrap{padding:16px 12px 36px}.form{flex-direction:column}.form button{padding:12px}}
</style></head><body><main class="wrap"><section class="panel"><h1>Voice Shop Assistant (simulator)</h1><p class="sub">Try shop questions and product actions by voice or text. This demo uses mock shop data.</p><div class="mic-area"><button class="mic" id="mic" aria-label="Start voice input" aria-pressed="false">🎙</button></div><p class="hint" id="hint">Tap the microphone to speak, or type below.</p><form class="form" id="form"><input id="input" maxlength="500" autocomplete="off" placeholder="Try: find products under $20" aria-label="Your request"><button type="submit">Send</button></form><div class="status" id="status" role="status"></div><section class="conversation" id="conversation" aria-live="polite"><div class="msg assistant">Hello! Ask about sales, find products, create a product, draft a post, get a checkout link, or ask what I remember.</div></section></section></main>
<script>
const convo=document.getElementById('conversation'),input=document.getElementById('input'),status=document.getElementById('status'),mic=document.getElementById('mic'),sessionId=sessionStorage.getItem('voice-shop-session')||crypto.randomUUID();sessionStorage.setItem('voice-shop-session',sessionId);
function card(title,items){const box=document.createElement('div');box.className='card';const h=document.createElement('h3');h.textContent=title;box.append(h);for(const item of items){const p=document.createElement('p');p.textContent=item;box.append(p)}return box}
function addMessage(text,who,data){const msg=document.createElement('div');msg.className='msg '+who;msg.textContent=text;if(data&&typeof data==='object'){if(data.summary_text){msg.append(card('Shop summary',[data.summary_text,'Revenue: $'+data.revenue_usd+' · Orders: '+data.orders,'Top product: '+data.top_product]))}else if(Array.isArray(data.products)){const c=card('Products',[data.count+' result(s)']);data.products.forEach(p=>{const row=document.createElement('div');row.className='product';const n=document.createElement('span');n.textContent=p.name;const price=document.createElement('span');price.className='price';price.textContent='$'+p.price_usd;row.append(n,price);c.append(row)});msg.append(c)}else if(data.url){const c=card('Checkout link',[data.url]);const a=document.createElement('a');a.href=data.url;a.textContent='Open checkout';a.target='_blank';a.rel='noopener noreferrer';const note=document.createElement('p');note.className='note';note.textContent='Demo link (mock shop)';c.append(a,note);msg.append(c)}else if(data.caption){msg.append(card('Drafted post',[data.caption,'Draft only — not published.']))}else if(data.product){msg.append(card(data.persisted?'Product created':'Product preview',[data.product.name+' · $'+data.product.price_usd,data.message]));}else if(data.lastAction!==undefined){msg.append(card('Assistant context',['Last action: '+(data.lastAction||'none'),'Recent searches: '+((data.recentQueries||[]).join(', ')||'none')]))}}convo.append(msg);msg.scrollIntoView({behavior:'smooth',block:'nearest'})}
async function send(text){addMessage(text,'user');input.value='';status.textContent='Thinking…';try{const r=await fetch('/api/demo/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence:text,sessionId})});const body=await r.json();if(!r.ok)throw new Error(body.error||'Request failed');addMessage(body.reply,'assistant',body.data);status.textContent=''}catch(e){addMessage(e.message||'Something went wrong. Please try again.','assistant');status.textContent=''}}
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(text)send(text)});
const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(Speech){const recognition=new Speech();recognition.lang=navigator.language||'en-US';recognition.interimResults=false;recognition.onstart=()=>{mic.setAttribute('aria-pressed','true');status.textContent='Listening…'};recognition.onend=()=>{mic.setAttribute('aria-pressed','false');if(status.textContent==='Listening…')status.textContent=''};recognition.onerror=()=>{status.textContent='Voice input unavailable. You can type instead.'};recognition.onresult=e=>{input.value=e.results[0][0].transcript;send(input.value)};mic.addEventListener('click',()=>{try{recognition.start()}catch{}})}else{mic.disabled=true;mic.title='Voice input is not supported in this browser';mic.style.opacity='.55';document.getElementById('hint').textContent='Voice input is unavailable in this browser. Type your request below.'}
</script></body></html>`

app.get('/demo', (_req: Request, res: Response) => {
  res.status(200).type('html').send(demoPage)
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
    const reply = data?.summary_text ?? data?.message ?? data?.caption ?? (data?.url ? `Here is your checkout link: ${data.url}` : data?.products ? `I found ${data.count} matching product(s).` : data?.lastAction !== undefined ? 'Here is what I remember about this shop.' : 'Done.')
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
