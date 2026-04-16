import { describe, expect, it } from "vitest";

import {
  canonicalizeRevisionPayload,
  hashRevisionPayload
} from "./hash.js";

describe("hashRevisionPayload", () => {
  it("creates the same hash for the same semantic payload", () => {
    const a = hashRevisionPayload({
      title: "Test",
      body: "A".repeat(60),
      summary: "B".repeat(30),
      sourceLinks: ["https://example.com/a"],
      publisherId: "pub-1",
      revisionNumber: 1,
      previousHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    });

    const b = hashRevisionPayload({
      summary: "B".repeat(30),
      body: "A".repeat(60),
      title: "Test",
      sourceLinks: ["https://example.com/a"],
      previousHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      revisionNumber: 1,
      publisherId: "pub-1"
    });

    expect(a).toBe(b);
  });

  it("includes revision ancestry in the canonical string", () => {
    const canonical = canonicalizeRevisionPayload({
      title: "Hello",
      body: "A".repeat(60),
      summary: "B".repeat(30),
      sourceLinks: ["https://example.com/a"],
      publisherId: "pub-1",
      revisionNumber: 2,
      previousHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111"
    });

    expect(canonical).toContain("\"revisionNumber\":2");
    expect(canonical).toContain("\"previousHash\"");
  });
});
