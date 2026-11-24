import { describe, expect, it } from "vitest";
import { buildCup, sampleProfile } from "./solid";

const profile = [
  { radius: 20, height: 0 },
  { radius: 25, height: 20 },
  { radius: 20, height: 40 },
];

describe("parametric cup geometry", () => {
  it("preserves control points and increasing heights", () => {
    const sampled = sampleProfile(profile);
    expect(sampled[0]).toEqual(profile[0]);
    expect(sampled[12]).toEqual(profile[1]);
    expect(sampled.at(-1)).toEqual(profile[2]);
    expect(
      sampled.every((p, i) => i === 0 || p.height > sampled[i - 1].height),
    ).toBe(true);
  });

  it("preserves millimeter dimensions", () => {
    const mesh = buildCup(profile, { wall: 2, floor: 3 });
    const bounds = mesh.boundingBox!;
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(40, 5);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(50, 5);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(50, 5);
    mesh.dispose();
  });

  it("has exactly two oppositely directed faces per edge", () => {
    const mesh = buildCup(profile, { wall: 2, floor: 3 });
    const indices = mesh.index!.array;
    const edges = new Map<string, { count: number; balance: number }>();
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = [indices[i], indices[i + 1], indices[i + 2]];
      expect(new Set(triangle).size).toBe(3);
      for (let j = 0; j < 3; j++) {
        const a = triangle[j],
          b = triangle[(j + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const edge = edges.get(key) ?? { count: 0, balance: 0 };
        edge.count++;
        edge.balance += a < b ? 1 : -1;
        edges.set(key, edge);
      }
    }
    expect(
      [...edges.values()].every((e) => e.count === 2 && e.balance === 0),
    ).toBe(true);
    mesh.dispose();
  });

  it("has positive signed volume for outward winding", () => {
    const mesh = buildCup(
      [
        { radius: 20, height: 0 },
        { radius: 20, height: 40 },
      ],
      { wall: 2, floor: 3 },
    );
    const p = mesh.getAttribute("position"),
      idx = mesh.index!.array;
    let volume = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i],
        b = idx[i + 1],
        c = idx[i + 2];
      const ax = p.getX(a),
        ay = p.getY(a),
        az = p.getZ(a);
      const bx = p.getX(b),
        by = p.getY(b),
        bz = p.getZ(b);
      const cx = p.getX(c),
        cy = p.getY(c),
        cz = p.getZ(c);
      volume +=
        (ax * (by * cz - bz * cy) +
          ay * (bz * cx - bx * cz) +
          az * (bx * cy - by * cx)) /
        6;
    }
    const expected = Math.PI * (20 ** 2 * 40 - 18 ** 2 * 37);
    expect(volume).toBeGreaterThan(0);
    expect(Math.abs(volume - expected) / expected).toBeLessThan(0.001);
    mesh.dispose();
  });

  it("rejects invalid geometry parameters", () => {
    expect(() => buildCup(profile, { wall: 20, floor: 3 })).toThrow();
    expect(() => buildCup(profile, { wall: 2, floor: 40 })).toThrow();
    expect(() => buildCup(profile, { wall: NaN, floor: 3 })).toThrow();
    expect(() =>
      sampleProfile([
        { radius: 20, height: 0 },
        { radius: 20, height: 0 },
      ]),
    ).toThrow();
  });
});
