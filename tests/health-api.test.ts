import { describe, it, expect } from "vitest";

describe("Health API contract", () => {
  it("returns expected JSON shape", async () => {
    const res = await fetch("http://localhost:3000/api/health");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("uptime");
    expect(data).toHaveProperty("services.database");
    expect(data).toHaveProperty("services.ai.claude");
    expect(data).toHaveProperty("services.ai.openai");
    expect(data).toHaveProperty("stats.users");
    expect(data).toHaveProperty("stats.firms");
    expect(data).toHaveProperty("stats.transactions");
    expect(data.status).toMatch(/healthy|degraded/);
  });
});
