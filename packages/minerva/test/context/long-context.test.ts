import { describe, expect, test } from "bun:test"
import { LongContext } from "../../src/context/long-context"

describe("LongContext", () => {
  test("getPressureLevel at thresholds", () => {
    expect(LongContext.getPressureLevel({ used: 54, max: 100, fraction: 0.54 })).toBe("normal")
    expect(LongContext.getPressureLevel({ used: 55, max: 100, fraction: 0.55 })).toBe("warning_55")
    expect(LongContext.getPressureLevel({ used: 75, max: 100, fraction: 0.75 })).toBe("warning_75")
    expect(LongContext.getPressureLevel({ used: 90, max: 100, fraction: 0.9 })).toBe("critical_90")
    expect(LongContext.getPressureLevel({ used: 100, max: 100, fraction: 1 })).toBe("critical_90")
  })
})
