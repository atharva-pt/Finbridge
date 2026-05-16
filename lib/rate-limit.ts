interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  options?: { interval?: number; uniqueTokenPerInterval?: number }
): {
  check: (limit: number, token: string) => Promise<RateLimitResult>;
} {
  const interval = options?.interval ?? 60_000;
  const tokenCache = new Map<string, number[]>();

  // Periodically clean up expired entries
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of tokenCache.entries()) {
      const valid = timestamps.filter((t) => t > now - interval);
      if (valid.length === 0) {
        tokenCache.delete(key);
      } else {
        tokenCache.set(key, valid);
      }
    }
  }, interval);

  // Allow the timer to not block process exit
  if (cleanup.unref) {
    cleanup.unref();
  }

  return {
    check(limit: number, token: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - interval;
      const reset = now + interval;

      const timestamps = (tokenCache.get(token) ?? []).filter(
        (t) => t > windowStart
      );

      if (timestamps.length >= limit) {
        tokenCache.set(token, timestamps);
        return Promise.resolve({
          success: false,
          limit,
          remaining: 0,
          reset,
        });
      }

      timestamps.push(now);
      tokenCache.set(token, timestamps);

      return Promise.resolve({
        success: true,
        limit,
        remaining: limit - timestamps.length,
        reset,
      });
    },
  };
}
