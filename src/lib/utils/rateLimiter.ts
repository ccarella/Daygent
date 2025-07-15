/**
 * Simple in-memory rate limiter for API endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request should be allowed
   * @param identifier Unique identifier for the client (e.g., user ID, IP)
   * @returns true if request is allowed, false if rate limited
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No previous requests or window expired
    if (!entry || now > entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    // Within window
    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time for an identifier
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    return entry?.resetTime || Date.now() + this.windowMs;
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Create rate limiters for different endpoints
export const syncRateLimiter = new RateLimiter(
  5 * 60 * 1000, // 5 minute window
  10, // 10 sync requests per 5 minutes
);

export const apiRateLimiter = new RateLimiter(
  60 * 1000, // 1 minute window
  100, // 100 requests per minute
);

// Cleanup expired entries every minute
if (typeof window === "undefined") {
  setInterval(() => {
    syncRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 60000);
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(
  identifier: string,
  limiter: RateLimiter,
): Response | null {
  if (!limiter.check(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const remaining = limiter.getRemaining(identifier);

    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limiter["maxRequests"].toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null;
}
