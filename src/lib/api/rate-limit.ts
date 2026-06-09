/**
 * Shared per-IP rate limiting for API routes.
 *
 * In-memory, per function instance — resets when the instance recycles, and
 * concurrent serverless instances each carry their own buckets. Good enough
 * as a demo-stage cost brake; switch to Upstash/Vercel KV under real load.
 * The hard backstop for Anthropic spend is the budget alert in the console.
 */

export function getClientIp(request: Request): string {
  // x-real-ip is set by Vercel's proxy from the real connection and cannot be
  // forged by the client. x-forwarded-for is only a fallback: clients may send
  // their own XFF header and proxies *append* to it, so its first entry is
  // attacker-controlled — never prefer it where x-real-ip exists.
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

/**
 * Create an isolated limiter (each route keeps its own budget).
 * Call the returned function once per request with the client IP.
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs = 60_000,
): (ip: string) => RateLimitResult {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function check(ip: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      // Clean up expired buckets occasionally to avoid unbounded growth
      if (buckets.size > 1000) {
        for (const [k, v] of buckets.entries()) {
          if (now > v.resetAt) buckets.delete(k);
        }
      }
      return { allowed: true };
    }

    if (bucket.count >= maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true };
  };
}

/** Standard Hebrew 429 response with Retry-After when known. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: "יותר מדי בקשות. נסי שוב בעוד כמה שניות." },
    {
      status: 429,
      headers: result.retryAfter
        ? { "Retry-After": String(result.retryAfter) }
        : undefined,
    },
  );
}
