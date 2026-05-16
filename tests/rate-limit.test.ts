import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", async () => {
    const limiter = rateLimit({ interval: 10_000 });
    const result = await limiter.check(5, "user-1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over the limit", async () => {
    const limiter = rateLimit({ interval: 10_000 });
    for (let i = 0; i < 3; i++) {
      await limiter.check(3, "user-2");
    }
    const result = await limiter.check(3, "user-2");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("isolates tokens from each other", async () => {
    const limiter = rateLimit({ interval: 10_000 });
    await limiter.check(1, "user-a");
    const blocked = await limiter.check(1, "user-a");
    const allowed = await limiter.check(1, "user-b");
    expect(blocked.success).toBe(false);
    expect(allowed.success).toBe(true);
  });
});
