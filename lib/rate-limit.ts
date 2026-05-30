import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function rateLimit(
  userId: string,
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000,
): Promise<NextResponse | null> {
  const bucketKey = `ratelimit:${userId}:${key}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.expire(bucketKey, windowSeconds);
  }

  if (count > maxRequests) {
    const ttl = await redis.ttl(bucketKey);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, ttl)) },
      },
    );
  }

  return null;
}
