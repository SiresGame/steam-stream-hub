import { describe, expect, it } from "vitest";
import { effectivePrice } from "./catalog";

describe("effectivePrice", () => {
  it("applies the game discount to the hourly price", () => { expect(effectivePrice({ price: 40, discount_percent: 25 })).toBe(30); });
  it("keeps the full price without a discount", () => { expect(effectivePrice({ price: 45, discount_percent: 0 })).toBe(45); });
});
