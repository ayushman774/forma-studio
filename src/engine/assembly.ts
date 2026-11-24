import { revolveSection, sampleProfile, type ProfilePoint } from "./solid";

import { validateSection } from "./section";

export type AssemblyOptions = {
  lower: readonly ProfilePoint[];
  upper: readonly ProfilePoint[];
  wall: number;
  floor: number;
  fittingRadius: number;
  engagement: number;
  clearance: number;
};

function section(
  body: ProfilePoint[],
  wall: number,
  floor: number,
  extension: number,
  outerRadius: number,
  innerRadius: number,
) {
  const start = body[0].height,
    end = body[body.length - 1].height;
  const floorY = start + floor;
  if (floorY >= end || body.some((p) => p.radius <= wall))
    throw new Error("Invalid body thickness");
  const i = body.findIndex((p) => p.height >= floorY);
  const a = body[i - 1],
    b = body[i];
  const floorRadius =
    a.radius +
    ((b.radius - a.radius) * (floorY - a.height)) / (b.height - a.height) -
    wall;
  const inner = [
    { radius: floorRadius, height: floorY },
    ...body
      .filter((p) => p.height > floorY)
      .map((p) => ({ radius: p.radius - wall, height: p.height })),
  ];
  const last = body[body.length - 1];
  const transition = Math.min(wall, (end - floorY) / 2);
  const neckStart = end - transition;
  const innerBody = inner.filter((p) => p.height < neckStart);
  const j = body.findIndex((p) => p.height >= neckStart);
  const lo = body[j - 1],
    hi = body[j];
  const neckRadius =
    lo.radius +
    ((hi.radius - lo.radius) * (neckStart - lo.height)) /
      (hi.height - lo.height);
  if (
    neckRadius <= innerRadius ||
    body.some((p) => p.height >= neckStart && p.radius <= innerRadius)
  )
    throw new Error("Insufficient neck wall");
  innerBody.push({
    radius: Math.min(neckRadius - wall, innerRadius),
    height: neckStart,
  });
  const profile = [
    { radius: 0, height: start },
    ...body,
    ...(last.radius === outerRadius
      ? []
      : [{ radius: outerRadius, height: end }]),
    { radius: outerRadius, height: end + extension },
    { radius: innerRadius, height: end + extension },
    { radius: innerRadius, height: end },
    ...innerBody.reverse(),
    { radius: 0, height: floorY },
  ];
  validateSection(profile);
  return profile;
}

export function buildAssembly(options: AssemblyOptions) {
  const { lower, upper, wall, floor, fittingRadius, engagement, clearance } =
    options;
  if (
    ![wall, floor, fittingRadius, engagement, clearance].every(
      Number.isFinite,
    ) ||
    wall <= 0 ||
    floor <= 0 ||
    fittingRadius <= wall ||
    engagement <= 0 ||
    clearance <= 0
  )
    throw new Error("Invalid assembly dimensions");
  const lowerBody = sampleProfile(lower);
  const upperEnd = upper[upper.length - 1];
  const upperBody = sampleProfile(upper)
    .reverse()
    .map((p) => ({ radius: p.radius, height: upperEnd.height - p.height }));
  const lowerEnd = lowerBody[lowerBody.length - 1],
    upperRim = upperBody[upperBody.length - 1];
  const socketRadius = fittingRadius + clearance,
    socketOuter = socketRadius + wall;
  if (Math.abs(lowerBody[0].height) > 1e-8 || Math.abs(upper[0].height) > 1e-8)
    throw new Error("Profiles must start at zero");
  // Both necks share the same axial interval; their radial intervals must be disjoint.
  if (socketRadius <= fittingRadius) throw new Error("Fitting collision");
  if (
    lowerEnd.radius < fittingRadius ||
    upperRim.radius < socketOuter ||
    engagement >= upperRim.height - floor
  )
    throw new Error("Insufficient space for fitting");
  // The socket extends down over the male neck. Its mouth meets the lower shoulder.
  const lowerSection = section(
    lowerBody,
    wall,
    floor,
    engagement,
    fittingRadius,
    fittingRadius - wall,
  );
  const upperSection = section(
    upperBody,
    wall,
    floor,
    engagement,
    socketOuter,
    socketRadius,
  );
  const fit = verifyFitting(
    lowerSection,
    upperSection,
    lowerEnd.height,
    upperRim.height,
    engagement,
  );
  const lowerGeometry = revolveSection(lowerSection);
  try {
    const upperGeometry = revolveSection(upperSection);
    return {
      lowerGeometry,
      upperGeometry,
      fit,
      upperAssemblyY: lowerEnd.height + engagement + upperRim.height,
      fitting: {
        maleRadius: fittingRadius,
        femaleRadius: socketRadius,
        radialClearance: clearance,
        diametralClearance: 2 * clearance,
        engagement,
      },
    };
  } catch (error) {
    lowerGeometry.dispose();
    throw error;
  }
}

/** For these axisymmetric sections, only the cylindrical necks share an open axial interval. */
export function verifyFitting(
  lower: readonly ProfilePoint[],
  upper: readonly ProfilePoint[],
  lowerRim: number,
  upperRim: number,
  engagement: number,
) {
  const neck = (p: readonly ProfilePoint[], rim: number) => {
    const tip = p.filter((v) => v.height > rim);
    if (
      tip.length !== 2 ||
      tip.some((v) => Math.abs(v.height - rim - engagement) > 1e-7)
    )
      throw new Error("Unexpected fitting section");
    return {
      inner: Math.min(...tip.map((v) => v.radius)),
      outer: Math.max(...tip.map((v) => v.radius)),
    };
  };
  const male = neck(lower, lowerRim),
    female = neck(upper, upperRim);
  const radialGap = female.inner - male.outer;
  if (!(radialGap > 0)) throw new Error("Assembly interference detected");
  return {
    radialGap,
    polygonGap: radialGap * Math.cos(Math.PI / 128),
    overlapHeight: engagement,
    shoulderContact: true,
  };
}
