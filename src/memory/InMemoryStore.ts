import type { MemoryStore, SellerContext } from './MemoryStore.js'
import { defaultContext } from './MemoryStore.js'

export class InMemoryStore implements MemoryStore {
  private store = new Map<string, SellerContext>()

  get(sellerId: string): SellerContext { return this.store.get(sellerId) ?? defaultContext(sellerId) }

  update(sellerId: string, patch: Partial<Omit<SellerContext, 'sellerId' | 'updatedAt'>>): SellerContext {
    const merged: SellerContext = {
      ...this.get(sellerId), ...patch, sellerId,
      recentQueries: patch.recentQueries ? patch.recentQueries.slice(-5) : this.get(sellerId).recentQueries,
      updatedAt: new Date().toISOString(),
    }
    this.store.set(sellerId, merged)
    return merged
  }

  clear(sellerId: string): void { this.store.delete(sellerId) }
}
