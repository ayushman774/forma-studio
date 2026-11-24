import type { ProfilePoint } from "./solid";
const eps = 1e-8;
function cross(a: ProfilePoint, b: ProfilePoint, c: ProfilePoint) {
  return (
    (b.radius - a.radius) * (c.height - a.height) -
    (b.height - a.height) * (c.radius - a.radius)
  );
}
function on(a: ProfilePoint, b: ProfilePoint, c: ProfilePoint) {
  return (
    Math.abs(cross(a, b, c)) <= eps &&
    c.radius >= Math.min(a.radius, b.radius) - eps &&
    c.radius <= Math.max(a.radius, b.radius) + eps &&
    c.height >= Math.min(a.height, b.height) - eps &&
    c.height <= Math.max(a.height, b.height) + eps
  );
}
function intersects(
  a: ProfilePoint,
  b: ProfilePoint,
  c: ProfilePoint,
  d: ProfilePoint,
) {
  const x = cross(a, b, c),
    y = cross(a, b, d),
    z = cross(c, d, a),
    w = cross(c, d, b);
  return (
    (((x > eps && y < -eps) || (x < -eps && y > eps)) &&
      ((z > eps && w < -eps) || (z < -eps && w > eps))) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function validateSection(points: readonly ProfilePoint[]) {
  const n = points.length;
  if (
    n < 4 ||
    points.some(
      (p) =>
        !Number.isFinite(p.radius) ||
        !Number.isFinite(p.height) ||
        p.radius < 0,
    )
  )
    throw new Error("Invalid meridian");
  for (let i = 0; i < n; i++) {
    const a = points[i],
      b = points[(i + 1) % n];
    if (Math.hypot(a.radius - b.radius, a.height - b.height) < eps)
      throw new Error("Duplicate meridian vertices");
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (intersects(a, b, points[j], points[(j + 1) % n]))
        throw new Error("Self-intersecting meridian");
    }
  }
}
