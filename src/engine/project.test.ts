import { describe, it, expect } from "vitest";
import {
  change,
  undo,
  redo,
  restore,
  type Design,
  type History,
} from "./project";
const profile = [
  { radius: 32, height: 0 },
  { radius: 35, height: 20 },
  { radius: 32, height: 40 },
];
const base: Design = {
  name: "Test",
  lower: profile,
  upper: profile,
  wall: 2,
  floor: 3,
  clearance: 0.25,
  engagement: 6,
};
const initial: History = { past: [], present: base, future: [] };
describe("project history", () => {
  it("undoes and redoes design changes", () => {
    const h = change(initial, { wall: 3 });
    expect(undo(h).present).toEqual(base);
    expect(redo(undo(h)).present.wall).toBe(3);
  });
  it("clears redo after a new edit", () => {
    expect(
      change(undo(change(initial, { wall: 3 })), { floor: 4 }).future,
    ).toEqual([]);
  });
  it("bounds history to 100 states", () => {
    let h = initial;
    for (let i = 0; i < 120; i++) h = change(h, { name: String(i) });
    expect(h.past.length).toBe(100);
  });
  it("restores valid data and rejects malformed data", () => {
    expect(restore(JSON.stringify({ ...base, name: "Saved" }), base).name).toBe(
      "Saved",
    );
    expect(restore("{", base)).toBe(base);
    expect(restore(JSON.stringify({ ...base, wall: -1 }), base)).toBe(base);
  });
});
