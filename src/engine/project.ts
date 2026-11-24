import type { ProfilePoint } from "./solid";
export type Design = {
  name: string;
  lower: ProfilePoint[];
  upper: ProfilePoint[];
  wall: number;
  floor: number;
  clearance: number;
  engagement: number;
};
export type History = { past: Design[]; present: Design; future: Design[] };
export const storageKey = "forma.design.v1";
export function change(h: History, patch: Partial<Design>): History {
  const present = { ...h.present, ...patch };
  if (JSON.stringify(present) === JSON.stringify(h.present)) return h;
  return { past: [...h.past, h.present].slice(-100), present, future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}
export function restore(raw: string | null, fallback: Design): Design {
  try {
    const d = JSON.parse(raw ?? "null") as Design | null;
    const profile = (p: ProfilePoint[], base: ProfilePoint[]) =>
      Array.isArray(p) &&
      p.length >= 3 &&
      p.length <= 20 &&
      p.every(
        (v, i) =>
          Number.isFinite(v.radius) &&
          v.radius > 0 &&
          v.radius <= 70 &&
          Number.isFinite(v.height) &&
          (i === 0 ? v.height === 0 : v.height - p[i - 1].height >= 2),
      ) &&
      p[p.length - 1].height === base[base.length - 1].height;
    if (
      !d ||
      typeof d.name !== "string" ||
      d.name.length > 100 ||
      !profile(d.lower, fallback.lower) ||
      !profile(d.upper, fallback.upper)
    )
      return fallback;
    const ranges = [
      [d.wall, 1, 5],
      [d.floor, 1, 8],
      [d.clearance, 0.1, 1],
      [d.engagement, 2, 12],
    ];
    return ranges.every(
      ([v, min, max]) => Number.isFinite(v) && v >= min && v <= max,
    )
      ? d
      : fallback;
  } catch {
    return fallback;
  }
}
