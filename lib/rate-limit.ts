import { NextResponse } from "next/server";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  userId: string,
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): NextResponse | null {
  const bucketKey = `${userId}:${key}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket) {
    buckets.set(bucketKey, { tokens: maxRequests - 1, lastRefill: now });
    return null;
  }

  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / windowMs) * maxRequests;
  const tokens = Math.min(maxRequests, bucket.tokens + refill);

  if (tokens <= 0) {
    const retryAfter = Math.ceil((windowMs - (elapsed % windowMs)) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  buckets.set(bucketKey, { tokens: tokens - 1, lastRefill: now });
  return null;
}

// Cleanup stale buckets every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > 120000) {
        buckets.delete(key);
      }
    }
  }, 300000);
}
