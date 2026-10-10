/**
 * MemoryStore interface — per-seller session memory.
 * Implementations: SqliteMemoryStore (production), InMemoryStore (tests).
 */

export interface SellerContext {
  sellerId:          string
  lastAction:        string | null     // e.g. 'created_product', 'searched'
  lastProductId:     string | null
  preferredLanguage: string            // e.g. 'en', 'bn'
  preferredTone:     'casual' | 'professional' | 'playful'
  recentQueries:     string[]          // last 5 search queries
  updatedAt:         string            // ISO-8601
}

export interface MemoryStore {
  get(sellerId: string): SellerContext
  update(sellerId: string, patch: Partial<Omit<SellerContext, 'sellerId' | 'updatedAt'>>): SellerContext
  clear(sellerId: string): void
}

export function defaultContext(sellerId: string): SellerContext {
  return {
    sellerId,
    lastAction:        null,
    lastProductId:     null,
    preferredLanguage: 'en',
    preferredTone:     'professional',
    recentQueries:     [],
    updatedAt:         new Date().toISOString(),
  }
}
