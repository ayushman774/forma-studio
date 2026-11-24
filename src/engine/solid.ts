import { BufferGeometry, Float32BufferAttribute } from 'three';

export type ProfilePoint = { radius: number; height: number };
export type SolidOptions = { wall: number; floor: number; segments?: number };

export function sampleProfile(points: readonly ProfilePoint[], subdivisions = 12): ProfilePoint[] {
  if (points.length < 2 || !Number.isInteger(subdivisions) || subdivisions < 1) throw new Error('Invalid profile sampling');
  points.forEach((p,i) => {
    if (!Number.isFinite(p.radius) || !Number.isFinite(p.height) || p.radius <= 0 || (i > 0 && p.height <= points[i-1].height)) throw new Error('Profile requires positive radii and increasing heights');
  });
  const result: ProfilePoint[] = [];
  for (let i=0;i<points.length-1;i++) {
    const a=points[i], b=points[i+1], prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+2)];
    const h=b.height-a.height;
    const slope=(b.radius-a.radius)/h;
    const limit=(m:number)=>slope===0 || m*slope<=0 ? 0 : Math.sign(slope)*Math.min(Math.abs(m),Math.abs(slope)*1.5);
    const m0=limit((b.radius-prev.radius)/(b.height-prev.height));
    const m1=limit((next.radius-a.radius)/(next.height-a.height));
    for(let j=0;j<subdivisions;j++){
      const t=j/subdivisions, t2=t*t,t3=t2*t;
      result.push({height:a.height+h*t,radius:(2*t3-3*t2+1)*a.radius+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*b.radius+(t3-t2)*h*m1});
    }
  }
  result.push({...points[points.length-1]});
  return result;
}

function radiusAt(points: readonly ProfilePoint[], height: number): number {
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(height<=b.height) return a.radius+(b.radius-a.radius)*(height-a.height)/(b.height-a.height);
  }
  return points[points.length-1].radius;
}

/** Closed cup with a radial wall and solid floor, in millimeters. */
export function buildCup(points: readonly ProfilePoint[], options: SolidOptions): BufferGeometry {
  const outer=sampleProfile(points);
  const {wall,floor,segments=128}=options;
  const bottom=outer[0].height, top=outer[outer.length-1].height;
  if(!Number.isFinite(wall)||!Number.isFinite(floor)||wall<=0||floor<=0||floor>=top-bottom||!Number.isInteger(segments)||segments<16||segments>512||outer.some(p=>p.radius<=wall)) throw new Error('Invalid solid dimensions');
  const cavityBottom=bottom+floor;
  const inner=[{height:cavityBottom,radius:radiusAt(outer,cavityBottom)-wall},...outer.filter(p=>p.height>cavityBottom).map(p=>({height:p.height,radius:p.radius-wall}))];
  const profile=[{radius:0,height:bottom},...outer,...inner.reverse(),{radius:0,height:cavityBottom}];
  const positions:number[]=[], indices:number[]=[], rings:number[][]=[];
  for(const p of profile){
    const ring:number[]=[];
    const count=p.radius===0?1:segments;
    for(let i=0;i<count;i++){
      const angle=2*Math.PI*i/segments;
      ring.push(positions.length/3);
      positions.push(p.radius*Math.cos(angle),p.height,p.radius*Math.sin(angle));
    }
    rings.push(ring);
  }
  for(let k=0;k<rings.length-1;k++){
    const a=rings[k],b=rings[k+1];
    for(let i=0;i<segments;i++){
      const j=(i+1)%segments;
      if(a.length===1) indices.push(a[0],b[i],b[j]);
      else if(b.length===1) indices.push(a[i],b[0],a[j]);
      else indices.push(a[i],b[i],a[j],a[j],b[i],b[j]);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
