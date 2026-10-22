import { describe, it, expect, beforeEach } from 'vitest'
import { MockShopAdapter }   from '../adapters/MockShopAdapter.js'
import { AnnzarShopAdapter } from '../adapters/AnnzarShopAdapter.js'
import { InMemoryStore }     from '../memory/InMemoryStore.js'
import { createDemoRateLimiter, parseDemoIntent } from '../demo.js'

describe('MockShopAdapter', () => {
  let adapter: MockShopAdapter
  beforeEach(() => { adapter = new MockShopAdapter() })

  describe('getShopSummary', () => {
    it('returns today summary with revenue > 0', async () => {
      const s = await adapter.getShopSummary('today')
      expect(s.period).toBe('today')
      expect(s.revenue).toBeGreaterThan(0)
      expect(s.orders).toBeGreaterThan(0)
    })
    it('week has more orders than today', async () => {
      const t = await adapter.getShopSummary('today')
      const w = await adapter.getShopSummary('week')
      expect(w.orders).toBeGreaterThan(t.orders)
    })
    it('topProduct is valid or null', async () => {
      const s = await adapter.getShopSummary('week')
      if (s.topProduct) { expect(s.topProduct.id).toBeTruthy(); expect(s.topProduct.price).toBeGreaterThan(0) }
    })
  })

  describe('searchProducts', () => {
    it('returns results for broad term', async () => {
      const r = await adapter.searchProducts('design')
      expect(r.length).toBeGreaterThan(0)
    })
    it('filters by max_price', async () => {
      const r = await adapter.searchProducts('', 20)
      r.forEach(p => expect(p.price).toBeLessThanOrEqual(20))
    })
    it('filters by category case-insensitive', async () => {
      const r = await adapter.searchProducts('', undefined, 'design')
      r.forEach(p => expect(p.category.toLowerCase()).toBe('design'))
      expect(r.length).toBeGreaterThan(0)
    })
    it('returns empty for nonsense query', async () => {
      expect(await adapter.searchProducts('xyzzy999doesnotexist')).toHaveLength(0)
    })
  })

  describe('createProduct', () => {
    it('preview when confirm=false', async () => {
      const { persisted } = await adapter.createProduct('T', 5, 'D', 'C', false)
      expect(persisted).toBe(false)
    })
    it('persists when confirm=true', async () => {
      const { product, persisted } = await adapter.createProduct('Persisted', 9, 'D', 'C', true)
      expect(persisted).toBe(true)
      const found = await adapter.searchProducts('Persisted')
      expect(found.some(p => p.id === product.id)).toBe(true)
    })
  })

  describe('draftPost', () => {
    it('pulse caption returned', async () => {
      const d = await adapter.draftPost('prod_001', 'pulse')
      expect(d.platform).toBe('pulse')
      expect(d.caption.length).toBeGreaterThan(10)
    })
    it('throws for unknown product', async () => {
      await expect(adapter.draftPost('bad', 'pulse')).rejects.toThrow()
    })
  })

  describe('getCheckoutLink', () => {
    it('URL contains product ID', async () => {
      const l = await adapter.getCheckoutLink('prod_001')
      expect(l.url).toContain('prod_001')
      expect(l.url).toMatch(/^https?:\/\//)
    })
    it('throws for unknown product', async () => {
      await expect(adapter.getCheckoutLink('bad')).rejects.toThrow()
    })
  })
})

describe('AnnzarShopAdapter (stub)', () => {
  const a = new AnnzarShopAdapter()
  it('getShopSummary not-implemented', async () => { await expect(a.getShopSummary('today')).rejects.toThrow('not implemented') })
  it('searchProducts not-implemented',  async () => { await expect(a.searchProducts('q')).rejects.toThrow('not implemented') })
  it('createProduct not-implemented',   async () => { await expect(a.createProduct('n',1,'d','c',true)).rejects.toThrow('not implemented') })
  it('draftPost not-implemented',       async () => { await expect(a.draftPost('id','pulse')).rejects.toThrow('not implemented') })
  it('getCheckoutLink not-implemented', async () => { await expect(a.getCheckoutLink('id')).rejects.toThrow('not implemented') })
})

describe('InMemoryStore', () => {
  let s: InMemoryStore
  beforeEach(() => { s = new InMemoryStore() })
  it('default context for new seller',   () => { expect(s.get('x').lastAction).toBeNull() })
  it('update and retrieve',              () => { s.update('x', { lastAction: 'test' }); expect(s.get('x').lastAction).toBe('test') })
  it('caps recentQueries at 5',          () => { for (let i=0;i<7;i++) s.update('x',{recentQueries:[...s.get('x').recentQueries,`q${i}`]}); expect(s.get('x').recentQueries.length).toBeLessThanOrEqual(5) })
  it('clear removes context',            () => { s.update('x',{lastAction:'y'}); s.clear('x'); expect(s.get('x').lastAction).toBeNull() })
})

describe('Auth logic (unit)', () => {
  const check = (key: string, hdr?: string) => {
    if (!key) return false
    const token = (hdr ?? '').replace(/^Bearer\s+/i,'').trim()
    return token === key
  }
  it('accepts correct token',     () => expect(check('k','Bearer k')).toBe(true))
  it('rejects wrong token',       () => expect(check('k','Bearer x')).toBe(false))
  it('rejects missing header',    () => expect(check('k',undefined)).toBe(false))
  it('rejects non-bearer scheme', () => expect(check('k','Basic k')).toBe(false))
  it('rejects unconfigured key',  () => expect(check('','Bearer x')).toBe(false))
})

describe('Demo intent parsing', () => {
  it('selects a today or week summary', () => {
    expect(parseDemoIntent('how did my shop do today')).toEqual({ tool: 'get_shop_summary', arguments: { period: 'today' } })
    expect(parseDemoIntent('sales')).toEqual({ tool: 'get_shop_summary', arguments: { period: 'week' } })
  })
  it('extracts product search and optional maximum price', () => {
    expect(parseDemoIntent('find products under $10')).toEqual({ tool: 'search_products', arguments: { query: 'a', max_price: 10 } })
  })
  it('extracts a product name and price', () => {
    expect(parseDemoIntent('create product Social Media Pack for $9')).toEqual({ tool: 'create_product', arguments: { name: 'Social Media Pack', price: 9 } })
  })
  it('recognizes post, checkout and context requests and gives help otherwise', () => {
    expect(parseDemoIntent('write a post for it').tool).toBe('draft_post')
    expect(parseDemoIntent('give me the checkout link').tool).toBe('get_checkout_link')
    expect(parseDemoIntent('what do you remember').tool).toBe('get_context')
    expect(parseDemoIntent('hello').tool).toBe('help')
  })
})

describe('Demo rate limit', () => {
  it('allows 20 requests and rejects the 21st request from one IP in a minute', () => {
    const limiter = createDemoRateLimiter()
    let passed = 0
    let rejected = 0
    const req = { ip: '192.0.2.1', socket: { remoteAddress: '192.0.2.1' } } as any
    const res = { setHeader: () => undefined, status(code: number) { if (code === 429) rejected++; return this }, json: () => undefined } as any
    for (let i = 0; i < 21; i++) limiter(req, res, () => { passed++ })
    expect(passed).toBe(20)
    expect(rejected).toBe(1)
  })
})
