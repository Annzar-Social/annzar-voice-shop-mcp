import Database from 'better-sqlite3'
import type { MemoryStore, SellerContext } from './MemoryStore.js'
import { defaultContext } from './MemoryStore.js'

/**
 * SQLite-backed MemoryStore. Survives server restarts.
 * Database file path defaults to ./data/memory.db (created automatically).
 */
export class SqliteMemoryStore implements MemoryStore {
  private db: Database.Database

  constructor(dbPath = './data/memory.db') {
    // Ensure data directory exists
    import('node:fs').then(fs => fs.mkdirSync('./data', { recursive: true })).catch(() => {})
    this.db = new Database(dbPath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS seller_context (
        seller_id          TEXT PRIMARY KEY,
        last_action        TEXT,
        last_product_id    TEXT,
        preferred_language TEXT    NOT NULL DEFAULT 'en',
        preferred_tone     TEXT    NOT NULL DEFAULT 'professional',
        recent_queries     TEXT    NOT NULL DEFAULT '[]',
        updated_at         TEXT    NOT NULL
      )
    `)
  }

  get(sellerId: string): SellerContext {
    const row = this.db.prepare('SELECT * FROM seller_context WHERE seller_id = ?').get(sellerId) as any
    if (!row) return defaultContext(sellerId)
    return {
      sellerId:          row.seller_id,
      lastAction:        row.last_action   ?? null,
      lastProductId:     row.last_product_id ?? null,
      preferredLanguage: row.preferred_language,
      preferredTone:     row.preferred_tone as SellerContext['preferredTone'],
      recentQueries:     JSON.parse(row.recent_queries),
      updatedAt:         row.updated_at,
    }
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
    this.db.prepare(`
      INSERT INTO seller_context
        (seller_id, last_action, last_product_id, preferred_language, preferred_tone, recent_queries, updated_at)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(seller_id) DO UPDATE SET
        last_action=excluded.last_action,
        last_product_id=excluded.last_product_id,
        preferred_language=excluded.preferred_language,
        preferred_tone=excluded.preferred_tone,
        recent_queries=excluded.recent_queries,
        updated_at=excluded.updated_at
    `).run(
      merged.sellerId,
      merged.lastAction,
      merged.lastProductId,
      merged.preferredLanguage,
      merged.preferredTone,
      JSON.stringify(merged.recentQueries),
      merged.updatedAt,
    )
    return merged
  }

  clear(sellerId: string): void {
    this.db.prepare('DELETE FROM seller_context WHERE seller_id = ?').run(sellerId)
  }
}
