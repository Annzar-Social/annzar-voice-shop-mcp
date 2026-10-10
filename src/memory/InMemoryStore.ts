import type { MemoryStore, SellerContext } from './MemoryStore.js'
import { defaultContext } from './MemoryStore.js'

/** In-process store — used in tests (no disk I/O). */
export class InMemoryStore implements MemoryStore {
  private store = new Map<string, SellerContext>()

  get(sellerId: string): SellerContext {
    return this.store.get(sellerId) ?? defaultContext(sellerId)
  }

  update(sellerId: string, patch: Partial<Omit<SellerContext, 'sellerId' | 'updatedAt'>>): SellerContext {
    const existing = this.get(sellerId)
    const merged: SellerContext = {
      ...existing,
      ...patch,
      sellerId,
      recentQueries: patch.recentQueries
        ? patch.recentQueries.slice(-5)
        : existing.recentQueries,
      updatedAt: new Date().toISOString(),
    }
    this.store.set(sellerId, merged)
    return merged
  }

  clear(sellerId: string): void {
    this.store.delete(sellerId)
  }
}
