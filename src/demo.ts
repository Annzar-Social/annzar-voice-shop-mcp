import type { Request, Response, NextFunction } from 'express'

export type DemoIntent =
  | { tool: 'get_shop_summary'; arguments: { period: 'today' | 'week' } }
  | { tool: 'search_products'; arguments: { query: string; max_price?: number } }
  | { tool: 'create_product'; arguments: { name: string; price: number } }
  | { tool: 'draft_post' }
  | { tool: 'get_checkout_link' }
  | { tool: 'get_context' }
  | { tool: 'help' }

export function parseDemoIntent(sentence: string): DemoIntent {
  const text = sentence.trim()
  const lower = text.toLowerCase()
  if (/\b(remember|context)\b/.test(lower)) return { tool: 'get_context' }
  if (/\b(how did my shop do|sales|revenue)\b/.test(lower)) {
    return { tool: 'get_shop_summary', arguments: { period: /\btoday\b/.test(lower) ? 'today' : 'week' } }
  }
  const create = text.match(/^\s*create\s+product\s+(.+?)\s+for\s+\$\s*(\d+(?:\.\d{1,2})?)\s*\.?\s*$/i)
  if (create) return { tool: 'create_product', arguments: { name: create[1].trim(), price: Number(create[2]) } }
  if (/\b(post|write\s+a\s+post)\b/.test(lower)) return { tool: 'draft_post' }
  if (/\b(checkout|link)\b/.test(lower)) return { tool: 'get_checkout_link' }
  if (/\b(find|search|show)\b/.test(lower)) {
    const priceMatch = lower.match(/\bunder\s+\$\s*(\d+(?:\.\d{1,2})?)/)
    const query = text
      .replace(/^\s*(?:find|search)\s+(?:for\s+)?/i, '')
      .replace(/^\s*show\s+(?:me\s+)?/i, '')
      .replace(/\s+under\s+\$\s*\d+(?:\.\d{1,2})?/i, '')
      .replace(/[?.!]+$/, '')
      .replace(/\bproducts?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    return { tool: 'search_products', arguments: { query, ...(priceMatch ? { max_price: Number(priceMatch[1]) } : {}) } }
  }
  return { tool: 'help' }
}

export function createDemoRateLimiter(limit = 20, windowMs = 60_000) {
  const requests = new Map<string, number[]>()
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const recent = (requests.get(key) ?? []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - recent[0])) / 1000)))
      res.status(429).json({ error: 'Demo rate limit exceeded. Try again in a minute.' })
      return
    }
    recent.push(now)
    requests.set(key, recent)
    // Bound bookkeeping if a public service sees many distinct IPs.
    if (requests.size > 10_000) {
      for (const [ip, times] of requests) {
        if (!times.some((time) => now - time < windowMs)) requests.delete(ip)
      }
      if (requests.size > 10_000) requests.delete(requests.keys().next().value as string)
    }
    next()
  }
}
