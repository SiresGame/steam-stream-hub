import { describe, expect, it } from "vitest";
import { normalizePromoCode, promoPrice } from "./promo";
import { effectivePrice } from "./catalog";
describe("promo rental prices", () => {
  it("discounts all selected hours of the next rental", () => { expect(promoPrice(40, 25) * 3).toBe(90); });
  it("combines the game and promo discounts with server rounding", () => { expect(promoPrice(effectivePrice({price: 35, discount_percent: 10}), 25)).toBe(24); });
  it("supports a free next session", () => { expect(promoPrice(35, 100)).toBe(0); });
  it("keeps the normal rate without a promo", () => { expect(promoPrice(35)).toBe(35); });
  it("accepts codes regardless of case and surrounding spaces", () => { expect(normalizePromoCode("  play25  ")).toBe("PLAY25"); });
});
