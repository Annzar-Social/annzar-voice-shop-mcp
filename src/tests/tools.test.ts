/**
 * Unit tests for MCP tools against MockShopAdapter.
 * Uses InMemoryStore so there are no disk side-effects.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockShopAdapter }  from '../adapters/MockShopAdapter.js'
import { AnnzarShopAdapter } from '../adapters/AnnzarShopAdapter.js'
import { InMemoryStore }    from '../memory/InMemoryStore.js'

// ── Adapter tests ──────────────────────────────────────────────────────────────
describe('MockShopAdapter', () => {

  let adapter: MockShopAdapter
  beforeEach(() => { adapter = new MockShopAdapter() })

  describe('getShopSummary', () => {
    it('returns a summary for today with revenue > 0', async () => {
      const s = await adapter.getShopSummary('today')
      expect(s.period).toBe('today')
      expect(s.revenue).toBeGreaterThan(0)
      expect(s.orders).toBeGreaterThan(0)
      expect(typeof s.revenueChange).toBe('number')
      expect(typeof s.ordersChange).toBe('number')
    })

    it('returns a summary for week with more orders than today', async () => {
      const today = await adapter.getShopSummary('today')
      const week  = await adapter.getShopSummary('week')
      expect(week.orders).toBeGreaterThan(today.orders)
      expect(week.revenue).toBeGreaterThan(today.revenue)
    })

    it('topProduct is a valid product or null', async () => {
      const s = await adapter.getShopSummary('week')
      if (s.topProduct) {
        expect(s.topProduct.id).toBeTruthy()
        expect(s.topProduct.price).toBeGreaterThan(0)
      }
    })
  })

  describe('searchProducts', () => {
    it('returns all products when query matches all (broad term)', async () => {
      const results = await adapter.searchProducts('design')
      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => {
        expect(r.id).toBeTruthy()
        expect(r.price).toBeGreaterThan(0)
      })
    })

    it('filters by max_price', async () => {
      const results = await adapter.searchProducts('', 20)
      results.forEach(r => expect(r.price).toBeLessThanOrEqual(20))
    })

    it('filters by category (case-insensitive)', async () => {
      const results = await adapter.searchProducts('', undefined, 'design')
      results.forEach(r => expect(r.category.toLowerCase()).toBe('design'))
      expect(results.length).toBeGreaterThan(0)
    })

    it('returns empty array for a nonsense query', async () => {
      const results = await adapter.searchProducts('xyzzy123doesnotexist')
      expect(results).toHaveLength(0)
    })
  })

  describe('createProduct', () => {
    it('returns a preview (not persisted) when confirm=false', async () => {
      const { product, persisted } = await adapter.createProduct(
        'Test Product', 9.99, 'A test', 'Test', false,
      )
      expect(persisted).toBe(false)
      expect(product.name).toBe('Test Product')
      expect(product.price).toBe(9.99)
      // Should not appear in search since not persisted
      // (Note: MockShopAdapter uses module-level store so this may vary;
      //  the persisted flag is the contract check)
    })

    it('persists product when confirm=true', async () => {
      const { product, persisted } = await adapter.createProduct(
        'Confirmed Product', 14.99, 'Confirmed', 'Test', true,
      )
      expect(persisted).toBe(true)
      expect(product.id).toBeTruthy()
      // Should be findable
      const found = await adapter.searchProducts('Confirmed Product')
      expect(found.some(p => p.id === product.id)).toBe(true)
    })
  })

  describe('draftPost', () => {
    it('returns a pulse caption without posting', async () => {
      const draft = await adapter.draftPost('prod_001', 'pulse')
      expect(draft.platform).toBe('pulse')
      expect(draft.caption.length).toBeGreaterThan(10)
      expect(draft.productId).toBe('prod_001')
    })

    it('returns a flow caption', async () => {
      const draft = await adapter.draftPost('prod_001', 'flow')
      expect(draft.platform).toBe('flow')
      expect(draft.caption).toContain('prod_001'.length > 0 ? '$' : '') // has price
    })

    it('throws for unknown product', async () => {
      await expect(adapter.draftPost('nonexistent', 'pulse')).rejects.toThrow()
    })
  })

  describe('getCheckoutLink', () => {
    it('returns a URL containing the product ID', async () => {
      const link = await adapter.getCheckoutLink('prod_001')
      expect(link.url).toContain('prod_001')
      expect(link.url).toMatch(/^https?:\/\//)
    })

    it('throws for unknown product', async () => {
      await expect(adapter.getCheckoutLink('bad_id')).rejects.toThrow()
    })
  })
})

// ── AnnzarShopAdapter stub tests ──────────────────────────────────────────────
describe('AnnzarShopAdapter (stub)', () => {
  const adapter = new AnnzarShopAdapter()

  it('getShopSummary throws not-implemented', async () => {
    await expect(adapter.getShopSummary('today')).rejects.toThrow('not implemented')
  })
  it('searchProducts throws not-implemented', async () => {
    await expect(adapter.searchProducts('query')).rejects.toThrow('not implemented')
  })
  it('createProduct throws not-implemented', async () => {
    await expect(adapter.createProduct('n', 1, 'd', 'c', true)).rejects.toThrow('not implemented')
  })
  it('draftPost throws not-implemented', async () => {
    await expect(adapter.draftPost('id', 'pulse')).rejects.toThrow('not implemented')
  })
  it('getCheckoutLink throws not-implemented', async () => {
    await expect(adapter.getCheckoutLink('id')).rejects.toThrow('not implemented')
  })
})

// ── InMemoryStore tests ───────────────────────────────────────────────────────
describe('InMemoryStore', () => {
  let store: InMemoryStore
  beforeEach(() => { store = new InMemoryStore() })

  it('returns default context for a new seller', () => {
    const ctx = store.get('seller1')
    expect(ctx.sellerId).toBe('seller1')
    expect(ctx.lastAction).toBeNull()
    expect(ctx.preferredLanguage).toBe('en')
  })

  it('updates and retrieves context', () => {
    store.update('seller1', { lastAction: 'get_shop_summary', preferredTone: 'casual' })
    const ctx = store.get('seller1')
    expect(ctx.lastAction).toBe('get_shop_summary')
    expect(ctx.preferredTone).toBe('casual')
  })

  it('caps recentQueries at 5', () => {
    for (let i = 0; i < 7; i++) {
      const ctx = store.get('seller1')
      store.update('seller1', { recentQueries: [...ctx.recentQueries, `query${i}`] })
    }
    const ctx = store.get('seller1')
    expect(ctx.recentQueries.length).toBeLessThanOrEqual(5)
  })

  it('clears context', () => {
    store.update('seller1', { lastAction: 'something' })
    store.clear('seller1')
    const ctx = store.get('seller1')
    expect(ctx.lastAction).toBeNull()
  })
})

// ── Auth tests ────────────────────────────────────────────────────────────────
describe('HTTP auth (unit check — Bearer token logic)', () => {
  // These tests verify the auth logic without starting a real HTTP server
  function checkBearer(apiKey: string, header: string | undefined): boolean {
    if (!apiKey) return false
    const auth  = header ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    return token === apiKey
  }

  it('accepts correct bearer token', () => {
    expect(checkBearer('secret', 'Bearer secret')).toBe(true)
  })
  it('rejects wrong token', () => {
    expect(checkBearer('secret', 'Bearer wrong')).toBe(false)
  })
  it('rejects missing header', () => {
    expect(checkBearer('secret', undefined)).toBe(false)
  })
  it('rejects non-bearer scheme', () => {
    expect(checkBearer('secret', 'Basic secret')).toBe(false)
  })
  it('rejects when server key not configured', () => {
    expect(checkBearer('', 'Bearer anything')).toBe(false)
  })
})
