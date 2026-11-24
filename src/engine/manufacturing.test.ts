import { describe,it,expect } from 'vitest';
import { Mesh, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { buildCup } from './solid';
import { buildAssembly } from './assembly';
import { inspectMesh } from './inspect';
describe('manufacturing',()=>{
 it('measures a cylindrical cup against analytic volume',()=>{
  const g=buildCup([{radius:30,height:0},{radius:30,height:40}],{wall:2,floor:3});
  try{const s=inspectMesh(g);expect(s.valid).toBe(true);expect(s.height).toBeCloseTo(40);expect(s.diameter).toBeCloseTo(60);expect(s.volumeCm3).toBeCloseTo(Math.PI*(900*40-784*37)/1000,1);}finally{g.dispose();}
 });
 it('rejects open and degenerate mesh topology',()=>{
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,2,0,0],3));g.setIndex([0,1,2]);
  try{const s=inspectMesh(g);expect(s.valid).toBe(false);expect(s.invalidEdges).toBe(3);expect(s.degenerate).toBe(1);}finally{g.dispose();}
 });
 it('exports both fitting components as binary STL with accurate Z extent',()=>{
  const a=buildAssembly({lower:[{radius:32,height:0},{radius:32,height:70}],upper:[{radius:32,height:0},{radius:20,height:65}],wall:2,floor:3,fittingRadius:24,engagement:6,clearance:.25});
  const m=new MeshBasicMaterial();
  try{for(const [g,height] of [[a.lowerGeometry,76],[a.upperGeometry,71]] as const){
   const s=inspectMesh(g);expect(s.valid).toBe(true);
   const mesh=new Mesh(g,m);mesh.rotation.x=Math.PI/2;mesh.updateMatrixWorld(true);
   const data=new STLExporter().parse(mesh,{binary:true});
   const count=data.getUint32(80,true);expect(count).toBe(s.triangles);expect(data.byteLength).toBe(84+50*count);
   let min=Infinity,max=-Infinity;
   for(let i=0;i<count;i++)for(let j=0;j<3;j++){const z=data.getFloat32(84+i*50+12+j*12+8,true);min=Math.min(min,z);max=Math.max(max,z);}
   expect(min).toBeCloseTo(0);expect(max-min).toBeCloseTo(height);
  }}finally{a.lowerGeometry.dispose();a.upperGeometry.dispose();m.dispose();}
 });
});
