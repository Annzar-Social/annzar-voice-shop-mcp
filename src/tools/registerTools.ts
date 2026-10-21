import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ShopAdapter } from '../adapters/ShopAdapter.js'
import type { MemoryStore } from '../memory/MemoryStore.js'

const DEFAULT_SELLER = 'default-seller'

export function registerTools(server: McpServer, adapter: ShopAdapter, memory: MemoryStore): void {

  server.tool('get_shop_summary',
    'Returns revenue, orders, top product, and comparison to the previous period. Use "today" for 24 h or "week" for 7 days.',
    { period: z.enum(['today', 'week']).describe('"today" (last 24 h) or "week" (last 7 days)') },
    async ({ period }) => {
      const s = await adapter.getShopSummary(period)
      memory.update(DEFAULT_SELLER, { lastAction: 'get_shop_summary' })
      const dir = (n: number) => n > 0 ? `+${n}%` : `${n}%`
      return { content: [{ type: 'text', text: JSON.stringify({ period: s.period, revenue_usd: s.revenue, orders: s.orders, top_product: s.topProduct?.name ?? 'N/A', revenue_change: dir(s.revenueChange), orders_change: dir(s.ordersChange), summary_text: `In the ${period}, you made $${s.revenue} across ${s.orders} orders. Top product: "${s.topProduct?.name ?? 'N/A'}". Revenue ${dir(s.revenueChange)} vs previous ${period}.` }, null, 2) }] }
    })

  server.tool('search_products',
    'Search the shop catalog by keyword, with optional max price (USD) and category filters.',
    { query: z.string().min(1).describe('Search keyword'), max_price: z.number().positive().optional().describe('Max price in USD'), category: z.string().optional().describe('Category name') },
    async ({ query, max_price, category }) => {
      const results = await adapter.searchProducts(query, max_price, category)
      const ctx = memory.get(DEFAULT_SELLER)
      memory.update(DEFAULT_SELLER, { lastAction: 'search_products', recentQueries: [...ctx.recentQueries, query] })
      return { content: [{ type: 'text', text: JSON.stringify({ query, count: results.length, products: results.map(p => ({ id: p.id, name: p.name, price_usd: p.price, category: p.category, description: p.description })) }, null, 2) }] }
    })

  server.tool('create_product',
    'Create a new product. Set confirm:false (default) for a preview; confirm:true to actually save.',
    { name: z.string().min(1), price: z.number().positive(), description: z.string().min(1), category: z.string().min(1), confirm: z.boolean().default(false).describe('false=preview only, true=persist') },
    async ({ name, price, description, category, confirm }) => {
      const { product, persisted } = await adapter.createProduct(name, price, description, category, confirm)
      if (persisted) memory.update(DEFAULT_SELLER, { lastAction: 'created_product', lastProductId: product.id })
      return { content: [{ type: 'text', text: JSON.stringify({ action: persisted ? 'created' : 'preview', persisted, product: { id: product.id, name: product.name, price_usd: product.price, category: product.category, description: product.description, created_at: product.createdAt }, message: persisted ? `Product "${product.name}" created at $${product.price}.` : `Preview ready. Set confirm:true to create "${product.name}" at $${product.price}.` }, null, 2) }] }
    })

  server.tool('draft_post',
    'Generate a promotional caption for Pulse or Flow. DOES NOT post — returns the draft text only.',
    { product_id: z.string().describe('Product ID'), platform: z.enum(['pulse', 'flow']) },
    async ({ product_id, platform }) => {
      const draft = await adapter.draftPost(product_id, platform)
      memory.update(DEFAULT_SELLER, { lastAction: 'draft_post' })
      return { content: [{ type: 'text', text: JSON.stringify({ product_id: draft.productId, platform: draft.platform, caption: draft.caption, char_count: draft.caption.length, note: 'Draft only — not published.' }, null, 2) }] }
    })

  server.tool('get_checkout_link',
    'Get a purchase URL for a product.',
    { product_id: z.string() },
    async ({ product_id }) => {
      const link = await adapter.getCheckoutLink(product_id)
      memory.update(DEFAULT_SELLER, { lastAction: 'get_checkout_link' })
      return { content: [{ type: 'text', text: JSON.stringify({ product_id: link.productId, url: link.url }, null, 2) }] }
    })

  server.tool('get_context',
    'Returns what the assistant remembers about this seller (last actions, preferences, recent queries).',
    {},
    async () => {
      return { content: [{ type: 'text', text: JSON.stringify(memory.get(DEFAULT_SELLER), null, 2) }] }
    })
}
