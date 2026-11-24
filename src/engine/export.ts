import { Mesh, MeshBasicMaterial, type BufferGeometry } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { inspectMesh } from './inspect';
import type { Design } from './project';

export function binaryStl(geometry:BufferGeometry):Uint8Array<ArrayBuffer>{
 if(!inspectMesh(geometry).valid)throw new Error('Mesh validation failed');
 const material=new MeshBasicMaterial();
 try{const mesh=new Mesh(geometry,material);mesh.rotation.x=Math.PI/2;mesh.updateMatrixWorld(true);
 const data=new STLExporter().parse(mesh,{binary:true});
 return new Uint8Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer);
 }finally{material.dispose();}
}
export function manufacturingReport(design:Design,material:string,density:number,parts:ReturnType<typeof inspectMesh>[]){
 return JSON.stringify({version:1,project:design.name,units:'mm',material,densityGPerCm3:density,parameters:{wall:design.wall,floor:design.floor,radialClearance:design.clearance,diametralClearance:2*design.clearance,engagement:design.engagement},components:parts.map((p,i)=>({name:i===0?'lower':'upper',...p,estimatedSolidMassG:p.volumeCm3*density})),limitations:['STL has no intrinsic unit metadata; import as millimeters.','Topology and meridian checks do not certify physical fit or printability.','Mass assumes solid material; slicer settings affect actual mass.']},null,2);
}
// ZIP store format: no compression, standard CRC32 and central directory.
export function zipFiles(files:Record<string,Uint8Array>):Uint8Array<ArrayBuffer>{
 const enc=new TextEncoder(),entries=Object.entries(files).map(([name,data])=>({name:enc.encode(name),data}));
 const localSize=entries.reduce((n,e)=>n+30+e.name.length+e.data.length,0);
 const centralSize=entries.reduce((n,e)=>n+46+e.name.length,0);
 const out=new Uint8Array(localSize+centralSize+22),v=new DataView(out.buffer);
 const u16=(p:number,x:number)=>v.setUint16(p,x,true),u32=(p:number,x:number)=>v.setUint32(p,x,true);
 let offset=0,central=localSize;
 for(const {name,data} of entries){
  let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  u32(offset,0x04034b50);u16(offset+4,20);u16(offset+12,33);u32(offset+14,crc);u32(offset+18,data.length);u32(offset+22,data.length);u16(offset+26,name.length);out.set(name,offset+30);out.set(data,offset+30+name.length);
  u32(central,0x02014b50);u16(central+4,20);u16(central+6,20);u16(central+14,33);u32(central+16,crc);u32(central+20,data.length);u32(central+24,data.length);u16(central+28,name.length);u32(central+42,offset);out.set(name,central+46);
  offset+=30+name.length+data.length;central+=46+name.length;
 }
 u32(central,0x06054b50);u16(central+8,entries.length);u16(central+10,entries.length);u32(central+12,centralSize);u32(central+16,localSize);return out;
}
