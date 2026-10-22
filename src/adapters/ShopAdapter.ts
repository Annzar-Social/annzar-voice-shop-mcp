export interface Product {
  id:          string
  name:        string
  price:       number
  description: string
  category:    string
  createdAt:   string
}

export interface ShopSummary {
  period:        'today' | 'week'
  revenue:       number
  orders:        number
  topProduct:    Product | null
  revenueChange: number
  ordersChange:  number
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
  getShopSummary(period: 'today' | 'week'): Promise<ShopSummary>
  searchProducts(query: string, maxPrice?: number, category?: string): Promise<Product[]>
  createProduct(name: string, price: number, description: string, category: string, confirm: boolean): Promise<{ product: Product; persisted: boolean }>
  draftPost(productId: string, platform: 'pulse' | 'flow'): Promise<DraftPost>
  getCheckoutLink(productId: string): Promise<CheckoutLink>
}
