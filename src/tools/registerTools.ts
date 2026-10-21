/**
 * Registers all MCP tools on the McpServer instance.
 * Each tool is defined with a Zod input schema, a description written for
 * a voice AI agent (Alexa+), and an async handler.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ShopAdapter } from '../adapters/ShopAdapter.js'
import type { MemoryStore } from '../memory/MemoryStore.js'

// Seller ID used for memory storage — replace with real auth context later
const DEFAULT_SELLER = 'default-seller'

export function registerTools(
  server:  McpServer,
  adapter: ShopAdapter,
  memory:  MemoryStore,
): void {

  // ── 1. get_shop_summary ────────────────────────────────────────────────────
  server.tool(
    'get_shop_summary',
    'Returns sales and revenue for the shop. Use "today" for a 24-hour view or "week" for the last 7 days, both with a comparison to the previous identical period.',
    {
      period: z.enum(['today', 'week']).describe('"today" (last 24 h) or "week" (last 7 days)'),
    },
    async ({ period }) => {
      const summary = await adapter.getShopSummary(period)
      memory.update(DEFAULT_SELLER, { lastAction: 'get_shop_summary' })
      const dir = (n: number) => n > 0 ? `+${n}%` : `${n}%`
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            period:         summary.period,
            revenue_usd:    summary.revenue,
            orders:         summary.orders,
            top_product:    summary.topProduct?.name ?? 'N/A',
            revenue_change: dir(summary.revenueChange),
            orders_change:  dir(summary.ordersChange),
            summary_text:   `In the ${period}, you made $${summary.revenue} across ${summary.orders} orders. ` +
                            `Your top product was "${summary.topProduct?.name ?? 'N/A'}". ` +
                            `Revenue is ${dir(summary.revenueChange)} vs the previous ${period}.`,
          }, null, 2),
        }],
      }
    },
  )

  // ── 2. search_products ─────────────────────────────────────────────────────
  server.tool(
    'search_products',
    'Search the shop\'s product catalog by keyword. Optionally filter by maximum price (USD) and category.',
    {
      query:     z.string().min(1).describe('Search term (product name, description keyword, or category)'),
      max_price: z.number().positive().optional().describe('Upper price limit in USD'),
      category:  z.string().optional().describe('Exact category name (e.g. "Design", "Code", "Education")'),
    },
    async ({ query, max_price, category }) => {
      const results = await adapter.searchProducts(query, max_price, category)
      // Update memory with last search query
      const ctx = memory.get(DEFAULT_SELLER)
      memory.update(DEFAULT_SELLER, {
        lastAction:    'search_products',
        recentQueries: [...ctx.recentQueries, query],
      })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            count:    results.length,
            products: results.map(p => ({
              id:          p.id,
              name:        p.name,
              price_usd:   p.price,
              category:    p.category,
              description: p.description,
            })),
          }, null, 2),
        }],
      }
    },
  )

  // ── 3. create_product ──────────────────────────────────────────────────────
  server.tool(
    'create_product',
    'Create a new digital product in the shop. If confirm is false (default), returns a preview without saving — useful for voice confirmation flow. Set confirm to true to actually save.',
    {
      name:        z.string().min(1).describe('Product name'),
      price:       z.number().positive().describe('Price in USD'),
      description: z.string().min(1).describe('Short product description'),
      category:    z.string().min(1).describe('Product category (e.g. "Design", "Code", "Education")'),
      confirm:     z.boolean().default(false).describe('Set to true to persist. False returns a preview only.'),
    },
    async ({ name, price, description, category, confirm }) => {
      const { product, persisted } = await adapter.createProduct(name, price, description, category, confirm)
      if (persisted) {
        memory.update(DEFAULT_SELLER, {
          lastAction:    'created_product',
          lastProductId: product.id,
        })
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action:    persisted ? 'created' : 'preview',
            persisted,
            product: {
              id:          product.id,
              name:        product.name,
              price_usd:   product.price,
              category:    product.category,
              description: product.description,
              created_at:  product.createdAt,
            },
            message: persisted
              ? `Product "${product.name}" created at $${product.price}.`
              : `Preview ready. Set confirm:true to create "${product.name}" at $${product.price}.`,
          }, null, 2),
        }],
      }
    },
  )

  // ── 4. draft_post ─────────────────────────────────────────────────────────
  server.tool(
    'draft_post',
    'Generate a short promotional caption for a product to post on Pulse (short-form video feed) or Flow (visual feed). Returns the draft caption only — does NOT post anywhere.',
    {
      product_id: z.string().describe('Product ID to promote'),
      platform:   z.enum(['pulse', 'flow']).describe('"pulse" (short video caption) or "flow" (visual post caption)'),
    },
    async ({ product_id, platform }) => {
      const draft = await adapter.draftPost(product_id, platform)
      memory.update(DEFAULT_SELLER, { lastAction: 'draft_post' })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            product_id:  draft.productId,
            platform:    draft.platform,
            caption:     draft.caption,
            char_count:  draft.caption.length,
            note:        'This is a draft only — the post has NOT been published. Review and post manually.',
          }, null, 2),
        }],
      }
    },
  )

  // ── 5. get_checkout_link ──────────────────────────────────────────────────
  server.tool(
    'get_checkout_link',
    'Get a checkout URL for a specific product. Share this link so customers can purchase directly.',
    {
      product_id: z.string().describe('Product ID'),
    },
    async ({ product_id }) => {
      const link = await adapter.getCheckoutLink(product_id)
      memory.update(DEFAULT_SELLER, { lastAction: 'get_checkout_link' })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            product_id: link.productId,
            url:        link.url,
          }, null, 2),
        }],
      }
    },
  )

  // ── 6. get_context ────────────────────────────────────────────────────────
  server.tool(
    'get_context',
    'Returns what the assistant remembers about this seller: last actions, last product created, language preference, tone, and recent search queries.',
    {},
    async () => {
      const ctx = memory.get(DEFAULT_SELLER)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(ctx, null, 2),
        }],
      }
    },
  )
}
