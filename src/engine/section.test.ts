import {describe,it,expect} from 'vitest';
import {validateSection} from './section';
import {buildAssembly} from './assembly';
import {inspectMesh} from './inspect';
describe('meridian integrity',()=>{
 it('accepts a simple closed section',()=>{expect(()=>validateSection([{radius:0,height:0},{radius:4,height:0},{radius:4,height:5},{radius:0,height:5}])).not.toThrow();});
 it('rejects crossing segments',()=>{expect(()=>validateSection([{radius:0,height:0},{radius:4,height:5},{radius:4,height:0},{radius:0,height:5}])).toThrow(/Self-intersecting/);});
 it('rejects duplicate vertices',()=>{expect(()=>validateSection([{radius:0,height:0},{radius:4,height:0},{radius:4,height:0},{radius:0,height:5}])).toThrow();});
 it('preserves topology across supported fitting extremes',()=>{
  for(const wall of [1,5])for(const clearance of [.1,1])for(const engagement of [2,12]){
   const a=buildAssembly({lower:[{radius:36,height:0},{radius:40,height:30},{radius:36,height:70}],upper:[{radius:36,height:0},{radius:35,height:30},{radius:20,height:65}],wall,floor:3,clearance,engagement,fittingRadius:24});
   try{expect(inspectMesh(a.lowerGeometry).valid).toBe(true);expect(inspectMesh(a.upperGeometry).valid).toBe(true);expect(a.upperAssemblyY).toBe(135+engagement);}finally{a.lowerGeometry.dispose();a.upperGeometry.dispose();}
  }
 });
});
