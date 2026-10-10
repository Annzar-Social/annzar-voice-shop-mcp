/**
 * AnnzarShopAdapter — real Annzar platform adapter.
 *
 * STUB — every method throws "not implemented".
 * Connect to real Annzar endpoints by implementing each method.
 * Expected env vars when implemented:
 *   ANNZAR_API_KEY      — Annzar v1 API key (from /search/admin key issuance)
 *   ANNZAR_SHOP_HANDLE  — the seller's shop handle on Annzar
 */
import type {
  ShopAdapter, Product, ShopSummary, DraftPost, CheckoutLink,
} from './ShopAdapter.js'

export class AnnzarShopAdapter implements ShopAdapter {
  private notImplemented(method: string): never {
    throw new Error(`AnnzarShopAdapter.${method}: not implemented — connect real Annzar endpoints here`)
  }

  async getShopSummary(_period: 'today' | 'week'): Promise<ShopSummary> {
    this.notImplemented('getShopSummary')
  }
  async searchProducts(_query: string, _maxPrice?: number, _category?: string): Promise<Product[]> {
    this.notImplemented('searchProducts')
  }
  async createProduct(_n: string, _p: number, _d: string, _c: string, _cf: boolean): Promise<{ product: Product; persisted: boolean }> {
    this.notImplemented('createProduct')
  }
  async draftPost(_productId: string, _platform: 'pulse' | 'flow'): Promise<DraftPost> {
    this.notImplemented('draftPost')
  }
  async getCheckoutLink(_productId: string): Promise<CheckoutLink> {
    this.notImplemented('getCheckoutLink')
  }
}
