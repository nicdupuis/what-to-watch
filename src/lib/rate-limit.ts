/**
 * Simple in-memory rate limiter per key (IP or route).
 * Tokens replenish over time. Not persistent across deploys.
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

export function rateLimit(
  key: string,
  maxTokens: number = 10,
  refillRatePerMinute: number = 10
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 60000; // minutes
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRatePerMinute);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  return { allowed: false, remaining: 0 };
}

// Clean up old buckets every 10 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 600000; // 10 minutes
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}, 600000);
