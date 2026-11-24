import { revolveSection, sampleProfile, type ProfilePoint } from './solid';

export type AssemblyOptions = {
  lower: readonly ProfilePoint[];
  upper: readonly ProfilePoint[];
  wall: number;
  floor: number;
  fittingRadius: number;
  engagement: number;
  clearance: number;
};

function section(body: ProfilePoint[], wall: number, floor: number, extension: number, outerRadius: number, innerRadius: number) {
  const start=body[0].height, end=body[body.length-1].height;
  const floorY=start+floor;
  if(floorY>=end || body.some(p=>p.radius<=wall)) throw new Error('Invalid body thickness');
  const i=body.findIndex(p=>p.height>=floorY);
  const a=body[i-1], b=body[i];
  const floorRadius=a.radius+(b.radius-a.radius)*(floorY-a.height)/(b.height-a.height)-wall;
  const inner=[{radius:floorRadius,height:floorY},...body.filter(p=>p.height>floorY).map(p=>({radius:p.radius-wall,height:p.height}))];
  const last=body[body.length-1];
  const innerLast=inner[inner.length-1];
  return [{radius:0,height:start},...body,
    ...(last.radius===outerRadius?[]:[{radius:outerRadius,height:end}]),
    {radius:outerRadius,height:end+extension},
    {radius:innerRadius,height:end+extension},
    {radius:innerRadius,height:end},
    ...(innerLast.radius===innerRadius?inner.slice(0,-1).reverse():inner.reverse()),
    {radius:0,height:floorY}];
}

export function buildAssembly(options: AssemblyOptions) {
  const {lower,upper,wall,floor,fittingRadius,engagement,clearance}=options;
  if(![wall,floor,fittingRadius,engagement,clearance].every(Number.isFinite)||wall<=0||floor<=0||fittingRadius<=wall||engagement<=0||clearance<=0) throw new Error('Invalid assembly dimensions');
  const lowerBody=sampleProfile(lower);
  const upperEnd=upper[upper.length-1];
  const upperBody=sampleProfile(upper).reverse().map(p=>({radius:p.radius,height:upperEnd.height-p.height}));
  const lowerEnd=lowerBody[lowerBody.length-1], upperRim=upperBody[upperBody.length-1];
  const socketRadius=fittingRadius+clearance, socketOuter=socketRadius+wall;
  if(lowerEnd.radius<fittingRadius || upperRim.radius<socketOuter || engagement>=upperRim.height-floor) throw new Error('Insufficient space for fitting');
  // The socket extends down over the male neck. Its mouth meets the lower shoulder.
  const lowerGeometry=revolveSection(section(lowerBody,wall,floor,engagement,fittingRadius,fittingRadius-wall));
  try {
    const upperGeometry=revolveSection(section(upperBody,wall,floor,engagement,socketOuter,socketRadius));
    return {lowerGeometry,upperGeometry,upperAssemblyY:lowerEnd.height+engagement+upperRim.height,
      fitting:{maleRadius:fittingRadius,femaleRadius:socketRadius,radialClearance:clearance,diametralClearance:2*clearance,engagement}};
  } catch(error){lowerGeometry.dispose();throw error;}
}
