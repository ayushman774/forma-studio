import { describe, it, expect } from "vitest";
import { buildAssembly, verifyFitting } from "./assembly";
describe("coaxial fitting", () => {
  it("reports conservative polygon clearance from generated sections", () => {
    const a = buildAssembly({
      lower: [
        { radius: 32, height: 0 },
        { radius: 32, height: 70 },
      ],
      upper: [
        { radius: 32, height: 0 },
        { radius: 20, height: 65 },
      ],
      wall: 2,
      floor: 3,
      fittingRadius: 24,
      engagement: 6,
      clearance: 0.25,
    });
    try {
      expect(a.fit.radialGap).toBeCloseTo(0.25);
      expect(a.fit.polygonGap).toBeCloseTo(0.25 * Math.cos(Math.PI / 128));
      expect(a.fit.overlapHeight).toBe(6);
    } finally {
      a.lowerGeometry.dispose();
      a.upperGeometry.dispose();
    }
  });
  it("rejects overlapping neck radii", () => {
    expect(() =>
      verifyFitting(
        [
          { radius: 24, height: 76 },
          { radius: 22, height: 76 },
        ],
        [
          { radius: 23, height: 71 },
          { radius: 25, height: 71 },
        ],
        70,
        65,
        6,
      ),
    ).toThrow(/interference/);
  });
});
