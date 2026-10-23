import type { ShopAdapter, Product, ShopSummary, DraftPost, CheckoutLink } from './ShopAdapter.js'

const PRODUCTS: Product[] = [
  { id: 'prod_001', name: 'Minimal UI Kit',        price: 29, description: 'Clean Figma component library with 200+ components.',           category: 'Design',    createdAt: '2026-09-01T10:00:00Z' },
  { id: 'prod_002', name: 'Social Media Pack',      price: 19, description: 'Canva templates for Instagram, Pulse, and Flow — 50 designs.', category: 'Templates', createdAt: '2026-09-05T11:00:00Z' },
  { id: 'prod_003', name: 'E-Commerce Starter Kit', price: 49, description: 'Full Next.js storefront template with cart and checkout.',      category: 'Code',      createdAt: '2026-09-10T09:00:00Z' },
  { id: 'prod_004', name: 'Logo Design Bundle',     price: 15, description: '30 customisable SVG logo templates across 6 industries.',       category: 'Design',    createdAt: '2026-09-12T08:00:00Z' },
  { id: 'prod_005', name: 'Podcast Cover Pack',     price: 12, description: 'High-res podcast artwork templates in 10 colour schemes.',       category: 'Templates', createdAt: '2026-09-15T14:00:00Z' },
  { id: 'prod_006', name: 'TypeScript MCP Course',  price: 39, description: 'Step-by-step video course building MCP servers from scratch.',  category: 'Education', createdAt: '2026-09-18T16:00:00Z' },
  { id: 'prod_007', name: 'Brand Identity Toolkit', price: 35, description: 'Fonts, palettes, mockups, and brand-guideline template.',        category: 'Design',    createdAt: '2026-09-20T10:30:00Z' },
  { id: 'prod_008', name: 'Motion Graphics Pack',   price: 59, description: 'After Effects + Lottie animations for social media stories.',   category: 'Video',     createdAt: '2026-09-22T13:00:00Z' },
  { id: 'prod_009', name: 'SEO Content Templates',  price: 18, description: '25 ready-to-fill blog and landing-page content frameworks.',    category: 'Templates', createdAt: '2026-09-25T09:00:00Z' },
  { id: 'prod_010', name: 'Icon Set — 1000 Icons',  price: 24, description: 'SVG and PNG icon set covering tech, food, travel, and more.',   category: 'Design',    createdAt: '2026-09-28T11:00:00Z' },
  { id: 'prod_011', name: 'Mini Icon Pack',           price: 4.99, description: 'A compact set of vector icons for quick mockups.',             category: 'Design',    createdAt: '2026-10-01T10:00:00Z' },
  { id: 'prod_012', name: 'Social Caption Templates', price: 7.50, description: 'Short caption templates for product launches and updates.',    category: 'Templates', createdAt: '2026-10-02T10:00:00Z' },
  { id: 'prod_013', name: 'Starter UI Kits',          price: 8.00, description: 'Reusable UI kit components for simple web prototypes.',       category: 'Code',      createdAt: '2026-10-03T10:00:00Z' },
  { id: 'prod_014', name: 'Video Story Pack',         price: 6.50, description: 'Editable video story templates for social media.',            category: 'Video',     createdAt: '2026-10-04T10:00:00Z' },
]

const NOW_MS   = Date.now()
const daysAgo  = (d: number) => new Date(NOW_MS - d * 86_400_000).toISOString()

const SALES = [
  { id: 's01', productId: 'prod_001', amount: 29, soldAt: daysAgo(0.1) },
  { id: 's02', productId: 'prod_003', amount: 49, soldAt: daysAgo(0.2) },
  { id: 's03', productId: 'prod_006', amount: 39, soldAt: daysAgo(0.3) },
  { id: 's04', productId: 'prod_002', amount: 19, soldAt: daysAgo(0.5) },
  { id: 's05', productId: 'prod_001', amount: 29, soldAt: daysAgo(1.1) },
  { id: 's06', productId: 'prod_007', amount: 35, soldAt: daysAgo(1.2) },
  { id: 's07', productId: 'prod_004', amount: 15, soldAt: daysAgo(1.4) },
  { id: 's08', productId: 'prod_008', amount: 59, soldAt: daysAgo(1.6) },
  { id: 's09', productId: 'prod_003', amount: 49, soldAt: daysAgo(2.1) },
  { id: 's10', productId: 'prod_005', amount: 12, soldAt: daysAgo(2.3) },
  { id: 's11', productId: 'prod_009', amount: 18, soldAt: daysAgo(2.5) },
  { id: 's12', productId: 'prod_001', amount: 29, soldAt: daysAgo(2.7) },
  { id: 's13', productId: 'prod_010', amount: 24, soldAt: daysAgo(3.2) },
  { id: 's14', productId: 'prod_006', amount: 39, soldAt: daysAgo(3.4) },
  { id: 's15', productId: 'prod_002', amount: 19, soldAt: daysAgo(3.6) },
  { id: 's16', productId: 'prod_003', amount: 49, soldAt: daysAgo(4.1) },
  { id: 's17', productId: 'prod_008', amount: 59, soldAt: daysAgo(4.3) },
  { id: 's18', productId: 'prod_001', amount: 29, soldAt: daysAgo(4.5) },
  { id: 's19', productId: 'prod_007', amount: 35, soldAt: daysAgo(5.1) },
  { id: 's20', productId: 'prod_004', amount: 15, soldAt: daysAgo(5.3) },
  { id: 's21', productId: 'prod_005', amount: 12, soldAt: daysAgo(5.6) },
  { id: 's22', productId: 'prod_009', amount: 18, soldAt: daysAgo(5.8) },
  { id: 's23', productId: 'prod_010', amount: 24, soldAt: daysAgo(6.0) },
  { id: 's24', productId: 'prod_006', amount: 39, soldAt: daysAgo(6.2) },
  { id: 's25', productId: 'prod_003', amount: 49, soldAt: daysAgo(6.4) },
  { id: 's26', productId: 'prod_001', amount: 29, soldAt: daysAgo(8.0) },
  { id: 's27', productId: 'prod_002', amount: 19, soldAt: daysAgo(10.0) },
  { id: 's28', productId: 'prod_006', amount: 39, soldAt: daysAgo(12.0) },
]

const productStore: Product[] = [...PRODUCTS]
let nextId = 15

export class MockShopAdapter implements ShopAdapter {
  async getShopSummary(period: 'today' | 'week'): Promise<ShopSummary> {
    const cutoffMs     = period === 'today' ? NOW_MS - 86_400_000 : NOW_MS - 7 * 86_400_000
    const prevCutoffMs = period === 'today' ? NOW_MS - 2 * 86_400_000 : NOW_MS - 14 * 86_400_000
    const cur  = SALES.filter(s => new Date(s.soldAt).getTime() >= cutoffMs)
    const prev = SALES.filter(s => { const t = new Date(s.soldAt).getTime(); return t >= prevCutoffMs && t < cutoffMs })
    const revenue = cur.reduce((s, x) => s + x.amount, 0)
    const prevRev = prev.reduce((s, x) => s + x.amount, 0)
    const pct = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100)
    const unitMap = new Map<string, number>()
    for (const s of cur) unitMap.set(s.productId, (unitMap.get(s.productId) ?? 0) + 1)
    const topId  = [...unitMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return { period, revenue, orders: cur.length, topProduct: topId ? (productStore.find(p => p.id === topId) ?? null) : null, revenueChange: pct(revenue, prevRev), ordersChange: pct(cur.length, prev.length) }
  }

  async searchProducts(query: string, maxPrice?: number, category?: string): Promise<Product[]> {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    return productStore.filter(p => {
      const txt = `${p.name} ${p.description} ${p.category}`.toLowerCase()
      const matchesQuery = terms.every(term => txt.includes(term) || (term.endsWith('s') && txt.includes(term.slice(0, -1))))
      return matchesQuery && (maxPrice == null || p.price <= maxPrice) && (category == null || p.category.toLowerCase() === category.toLowerCase())
    })
  }

  async createProduct(name: string, price: number, description: string, category: string, confirm: boolean): Promise<{ product: Product; persisted: boolean }> {
    if (confirm && productStore.length >= 100) throw new Error('Mock shop product limit reached (100).')
    const product: Product = { id: `prod_${String(nextId++).padStart(3, '0')}`, name, price, description, category, createdAt: new Date().toISOString() }
    if (confirm) productStore.push(product)
    return { product, persisted: confirm }
  }

  async draftPost(productId: string, platform: 'pulse' | 'flow'): Promise<DraftPost> {
    const p = productStore.find(x => x.id === productId)
    if (!p) throw new Error(`Product ${productId} not found`)
    const description = p.description.replace(/[.!?]+$/, '')
    const captions: Record<'pulse' | 'flow', string> = {
      pulse: `New drop: ${p.name}. ${description}. Only $${p.price}. #${p.category.replace(/\s/g, '')}`,
      flow:  `🛍️ ${p.name}\n\n${p.description}\n\n💰 Just $${p.price}\n\n#${p.category.replace(/\s/g, '')} #Annzar`,
    }
    return { productId, platform, caption: captions[platform] }
  }

  async getCheckoutLink(productId: string): Promise<CheckoutLink> {
    const p = productStore.find(x => x.id === productId)
    if (!p) throw new Error(`Product ${productId} not found`)
    return { productId, url: `https://annzar.com/demo-checkout/${productId}?utm_source=voice&utm_medium=mcp` }
  }
}
