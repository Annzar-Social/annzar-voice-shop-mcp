/**
 * JSON file-backed MemoryStore.
 *
 * Default store — no native compilation required.
 * Persists seller context to ./data/memory.json.
 *
 * For production use with higher write throughput, swap to SqliteMemoryStore.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import type { MemoryStore, SellerContext } from './MemoryStore.js'
import { defaultContext } from './MemoryStore.js'

export class JsonFileMemoryStore implements MemoryStore {
  private filePath: string
  private data: Record<string, SellerContext>

  constructor(filePath = './data/memory.json') {
    this.filePath = filePath
    mkdirSync('./data', { recursive: true })
    if (existsSync(filePath)) {
      try {
        this.data = JSON.parse(readFileSync(filePath, 'utf8'))
      } catch {
        this.data = {}
      }
    } else {
      this.data = {}
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }

  get(sellerId: string): SellerContext {
    return this.data[sellerId] ?? defaultContext(sellerId)
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
    this.data[sellerId] = merged
    this.save()
    return merged
  }

  clear(sellerId: string): void {
    delete this.data[sellerId]
    this.save()
  }
}
