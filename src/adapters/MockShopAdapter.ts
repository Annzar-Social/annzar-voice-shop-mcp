import type {
  ShopAdapter, Product, ShopSummary, DraftPost, CheckoutLink,
} from './ShopAdapter.js'

// ── Demo catalog ──────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  { id: 'prod_001', name: 'Minimal UI Kit',         price: 29,  description: 'Clean Figma component library with 200+ components.',            category: 'Design',    createdAt: '2026-09-01T10:00:00Z' },
  { id: 'prod_002', name: 'Social Media Pack',       price: 19,  description: 'Canva templates for Instagram, Pulse, and Flow — 50 designs.',  category: 'Templates', createdAt: '2026-09-05T11:00:00Z' },
  { id: 'prod_003', name: 'E-Commerce Starter Kit',  price: 49,  description: 'Full Next.js storefront template with cart and checkout.',       category: 'Code',      createdAt: '2026-09-10T09:00:00Z' },
  { id: 'prod_004', name: 'Logo Design Bundle',      price: 15,  description: '30 customisable SVG logo templates across 6 industries.',        category: 'Design',    createdAt: '2026-09-12T08:00:00Z' },
  { id: 'prod_005', name: 'Podcast Cover Pack',      price: 12,  description: 'High-res podcast artwork templates in 10 colour schemes.',        category: 'Templates', createdAt: '2026-09-15T14:00:00Z' },
  { id: 'prod_006', name: 'TypeScript MCP Course',   price: 39,  description: 'Step-by-step video course building MCP servers from scratch.',   category: 'Education', createdAt: '2026-09-18T16:00:00Z' },
  { id: 'prod_007', name: 'Brand Identity Toolkit',  price: 35,  description: 'Fonts, palettes, mockups, and brand-guideline template.',         category: 'Design',    createdAt: '2026-09-20T10:30:00Z' },
  { id: 'prod_008', name: 'Motion Graphics Pack',    price: 59,  description: 'After Effects + Lottie animations for social media stories.',    category: 'Video',     createdAt: '2026-09-22T13:00:00Z' },
  { id: 'prod_009', name: 'SEO Content Templates',   price: 18,  description: '25 ready-to-fill blog and landing-page content frameworks.',     category: 'Templates', createdAt: '2026-09-25T09:00:00Z' },
  { id: 'prod_010', name: 'Icon Set — 1000 Icons',   price: 24,  description: 'SVG and PNG icon set covering tech, food, travel, and more.',    category: 'Design',    createdAt: '2026-09-28T11:00:00Z' },
]

// ── Demo sales — 28 fake sales across the last 7 days ────────────────────────
const NOW_MS = Date.now()
const daysAgo = (d: number) => new Date(NOW_MS - d * 86_400_000).toISOString()

const SALES = [
  // today (day 0)
  { id: 's01', productId: 'prod_001', amount: 29,  soldAt: daysAgo(0.1) },
  { id: 's02', productId: 'prod_003', amount: 49,  soldAt: daysAgo(0.2) },
  { id: 's03', productId: 'prod_006', amount: 39,  soldAt: daysAgo(0.3) },
  { id: 's04', productId: 'prod_002', amount: 19,  soldAt: daysAgo(0.5) },
  // yesterday (day 1)
  { id: 's05', productId: 'prod_001', amount: 29,  soldAt: daysAgo(1.1) },
  { id: 's06', productId: 'prod_007', amount: 35,  soldAt: daysAgo(1.2) },
  { id: 's07', productId: 'prod_004', amount: 15,  soldAt: daysAgo(1.4) },
  { id: 's08', productId: 'prod_008', amount: 59,  soldAt: daysAgo(1.6) },
  // day 2
  { id: 's09', productId: 'prod_003', amount: 49,  soldAt: daysAgo(2.1) },
  { id: 's10', productId: 'prod_005', amount: 12,  soldAt: daysAgo(2.3) },
  { id: 's11', productId: 'prod_009', amount: 18,  soldAt: daysAgo(2.5) },
  { id: 's12', productId: 'prod_001', amount: 29,  soldAt: daysAgo(2.7) },
  // day 3
  { id: 's13', productId: 'prod_010', amount: 24,  soldAt: daysAgo(3.2) },
  { id: 's14', productId: 'prod_006', amount: 39,  soldAt: daysAgo(3.4) },
  { id: 's15', productId: 'prod_002', amount: 19,  soldAt: daysAgo(3.6) },
  // day 4
  { id: 's16', productId: 'prod_003', amount: 49,  soldAt: daysAgo(4.1) },
  { id: 's17', productId: 'prod_008', amount: 59,  soldAt: daysAgo(4.3) },
  { id: 's18', productId: 'prod_001', amount: 29,  soldAt: daysAgo(4.5) },
  // day 5
  { id: 's19', productId: 'prod_007', amount: 35,  soldAt: daysAgo(5.1) },
  { id: 's20', productId: 'prod_004', amount: 15,  soldAt: daysAgo(5.3) },
  { id: 's21', productId: 'prod_005', amount: 12,  soldAt: daysAgo(5.6) },
  { id: 's22', productId: 'prod_009', amount: 18,  soldAt: daysAgo(5.8) },
  // day 6
  { id: 's23', productId: 'prod_010', amount: 24,  soldAt: daysAgo(6.0) },
  { id: 's24', productId: 'prod_006', amount: 39,  soldAt: daysAgo(6.2) },
  { id: 's25', productId: 'prod_003', amount: 49,  soldAt: daysAgo(6.4) },
  // previous week (days 7-13, used for comparison)
  { id: 's26', productId: 'prod_001', amount: 29,  soldAt: daysAgo(8.0) },
  { id: 's27', productId: 'prod_002', amount: 19,  soldAt: daysAgo(10.0) },
  { id: 's28', productId: 'prod_006', amount: 39,  soldAt: daysAgo(12.0) },
]

// Mutable in-memory store so createProduct tests can verify persistence
const productStore: Product[] = [...PRODUCTS]
let nextId = 11

export class MockShopAdapter implements ShopAdapter {
  async getShopSummary(period: 'today' | 'week'): Promise<ShopSummary> {
    const cutoffMs     = period === 'today' ? NOW_MS - 86_400_000 : NOW_MS - 7 * 86_400_000
    const prevCutoffMs = period === 'today'
      ? NOW_MS - 2 * 86_400_000
      : NOW_MS - 14 * 86_400_000

    const periodSales = SALES.filter(s => new Date(s.soldAt).getTime() >= cutoffMs)
    const prevSales   = SALES.filter(s => {
      const t = new Date(s.soldAt).getTime()
      return t >= prevCutoffMs && t < cutoffMs
    })

    const revenue     = periodSales.reduce((s, x) => s + x.amount, 0)
    const prevRevenue = prevSales  .reduce((s, x) => s + x.amount, 0)
    const orders      = periodSales.length
    const prevOrders  = prevSales.length

    // Top product by units sold in the period
    const unitMap = new Map<string, number>()
    for (const s of periodSales) unitMap.set(s.productId, (unitMap.get(s.productId) ?? 0) + 1)
    const topId  = [...unitMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const topProduct = topId ? (productStore.find(p => p.id === topId) ?? null) : null

    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

    return {
      period,
      revenue,
      orders,
      topProduct,
      revenueChange: pct(revenue, prevRevenue),
      ordersChange:  pct(orders,  prevOrders),
    }
  }

  async searchProducts(query: string, maxPrice?: number, category?: string): Promise<Product[]> {
    const q = query.toLowerCase()
    return productStore.filter(p => {
      const matchText = p.name.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        p.category.toLowerCase().includes(q)
      const matchPrice    = maxPrice  == null || p.price <= maxPrice
      const matchCategory = category == null ||
        p.category.toLowerCase() === category.toLowerCase()
      return matchText && matchPrice && matchCategory
    })
  }

  async createProduct(
    name: string, price: number, description: string, category: string, confirm: boolean,
  ): Promise<{ product: Product; persisted: boolean }> {
    const product: Product = {
      id:          `prod_${String(nextId++).padStart(3, '0')}`,
      name,
      price,
      description,
      category,
      createdAt:   new Date().toISOString(),
    }
    if (confirm) productStore.push(product)
    return { product, persisted: confirm }
  }

  async draftPost(productId: string, platform: 'pulse' | 'flow'): Promise<DraftPost> {
    const product = productStore.find(p => p.id === productId)
    if (!product) throw new Error(`Product ${productId} not found`)

    const captions: Record<'pulse' | 'flow', string> = {
      pulse: `✨ New drop: ${product.name} — ${product.description} Only $${product.price}. Grab yours before it's gone! 🔥 #${product.category.replace(/\s/g,'')} #Digital #Shop`,
      flow:  `🛍️ ${product.name}\n\n${product.description}\n\n💰 Just $${product.price} — link in profile.\n\n#${product.category.replace(/\s/g,'')} #CreatorEconomy #Annzar`,
    }

    return { productId, platform, caption: captions[platform] }
  }

  async getCheckoutLink(productId: string): Promise<CheckoutLink> {
    const product = productStore.find(p => p.id === productId)
    if (!product) throw new Error(`Product ${productId} not found`)
    return {
      productId,
      url: `https://annzar.com/product/${productId}?utm_source=voice&utm_medium=mcp`,
    }
  }
}
