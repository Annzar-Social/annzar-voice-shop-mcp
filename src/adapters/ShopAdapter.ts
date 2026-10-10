/**
 * ShopAdapter interface — the single seam between MCP tools and the
 * underlying shop platform. Swap adapters via SHOP_ADAPTER env var.
 */

export interface Product {
  id:          string
  name:        string
  price:       number   // USD
  description: string
  category:    string
  createdAt:   string   // ISO-8601
}

export interface Sale {
  id:        string
  productId: string
  amount:    number
  soldAt:    string   // ISO-8601
}

export interface ShopSummary {
  period:           'today' | 'week'
  revenue:          number
  orders:           number
  topProduct:       Product | null
  revenueChange:    number   // percentage vs previous period (+/-)
  ordersChange:     number
}

export interface DraftPost {
  productId: string
  platform:  'pulse' | 'flow'
  caption:   string
}

export interface CheckoutLink {
  productId: string
  url:       string
}

export interface ShopAdapter {
  /** Sales and revenue summary for 'today' or last 7 days ('week'). */
  getShopSummary(period: 'today' | 'week'): Promise<ShopSummary>

  /** Full-text + optional filter product search. */
  searchProducts(query: string, maxPrice?: number, category?: string): Promise<Product[]>

  /**
   * Create a new product. If confirm is false, returns a preview without
   * persisting. If confirm is true, persists and returns the saved product.
   */
  createProduct(
    name:        string,
    price:       number,
    description: string,
    category:    string,
    confirm:     boolean,
  ): Promise<{ product: Product; persisted: boolean }>

  /** Generate a promotional caption (does NOT post — preview only). */
  draftPost(productId: string, platform: 'pulse' | 'flow'): Promise<DraftPost>

  /** Return a checkout URL for the product. */
  getCheckoutLink(productId: string): Promise<CheckoutLink>
}
