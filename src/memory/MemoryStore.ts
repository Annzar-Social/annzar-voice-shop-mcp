export interface SellerContext {
  sellerId:          string
  lastAction:        string | null
  lastProductId:     string | null
  preferredLanguage: string
  preferredTone:     'casual' | 'professional' | 'playful'
  recentQueries:     string[]
  updatedAt:         string
}

export interface MemoryStore {
  get(sellerId: string): SellerContext
  update(sellerId: string, patch: Partial<Omit<SellerContext, 'sellerId' | 'updatedAt'>>): SellerContext
  clear(sellerId: string): void
}

export function defaultContext(sellerId: string): SellerContext {
  return { sellerId, lastAction: null, lastProductId: null, preferredLanguage: 'en', preferredTone: 'professional', recentQueries: [], updatedAt: new Date().toISOString() }
}
