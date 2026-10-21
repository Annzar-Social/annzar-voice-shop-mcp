import type { ShopAdapter, Product, ShopSummary, DraftPost, CheckoutLink } from './ShopAdapter.js'

/** Stub — every method throws. Wire real Annzar endpoints here. */
export class AnnzarShopAdapter implements ShopAdapter {
  private ni(m: string): never { throw new Error(`AnnzarShopAdapter.${m}: not implemented`) }
  async getShopSummary(_p: 'today' | 'week'): Promise<ShopSummary>                                              { this.ni('getShopSummary') }
  async searchProducts(_q: string, _mp?: number, _c?: string): Promise<Product[]>                               { this.ni('searchProducts') }
  async createProduct(_n: string, _p: number, _d: string, _c: string, _cf: boolean): Promise<{ product: Product; persisted: boolean }> { this.ni('createProduct') }
  async draftPost(_id: string, _pl: 'pulse' | 'flow'): Promise<DraftPost>                                       { this.ni('draftPost') }
  async getCheckoutLink(_id: string): Promise<CheckoutLink>                                                      { this.ni('getCheckoutLink') }
}
