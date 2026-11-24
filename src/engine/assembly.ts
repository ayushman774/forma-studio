import { buildCup, type ProfilePoint } from './solid';

export type AssemblyOptions = {
  lower: readonly ProfilePoint[];
  upper: readonly ProfilePoint[];
  wall: number;
  floor: number;
  fittingRadius: number;
  engagement: number;
  clearance: number;
};

export function buildAssembly(options: AssemblyOptions) {
  const { lower, upper, wall, floor, fittingRadius, engagement, clearance } = options;
  if (![wall,floor,fittingRadius,engagement,clearance].every(Number.isFinite) ||
      wall <= 0 || floor <= 0 || fittingRadius <= wall || engagement <= 0 || clearance <= 0 ||
      lower.length < 2 || upper.length < 2) throw new Error('Invalid assembly dimensions');
  const lowerEnd = lower[lower.length - 1];
  const upperStart = upper[0];
  const upperEnd = upper[upper.length - 1];
  const socketRadius = fittingRadius + clearance;
  const socketOuter = socketRadius + wall;
  if (lowerEnd.radius < fittingRadius || upperStart.radius < socketOuter ||
      engagement >= upperEnd.height - upperStart.height - floor) throw new Error('Insufficient space for fitting');
  // Both parts are generated upright in their own printable orientation.
  // The upper part is inverted for assembly, with its opening facing the lower part.
  const lowerProfile = [...lower, {radius:fittingRadius,height:lowerEnd.height + engagement}];
  const upperProfile = [...upper].reverse().map(p=>({radius:p.radius,height:upperEnd.height-p.height}));
  const socketStart = upperProfile[upperProfile.length-1].height;
  upperProfile.push({radius:socketOuter,height:socketStart+engagement});
  const lowerGeometry = buildCup(lowerProfile,{wall,floor});
  try {
    const upperGeometry = buildCup(upperProfile,{wall,floor});
    return {
      lowerGeometry, upperGeometry,
      upperAssemblyY: lowerEnd.height + engagement + socketStart + engagement,
      fitting: { maleRadius:fittingRadius, femaleRadius:socketRadius, radialClearance:clearance, diametralClearance:2*clearance, engagement },
    };
  } catch(error) {
    lowerGeometry.dispose();
    throw error;
  }
}
