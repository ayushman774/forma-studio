import { describe, expect, it } from 'vitest';
import { buildAssembly, type AssemblyOptions } from './assembly';

const options: AssemblyOptions = {
  lower: [{radius:30,height:0},{radius:30,height:40}],
  upper: [{radius:30,height:0},{radius:30,height:50}],
  wall:2, floor:3, fittingRadius:24, engagement:6, clearance:0.25,
};

describe('component assembly', () => {
  it('generates two independent closed components', () => {
    const assembly = buildAssembly(options);
    try {
      for (const mesh of [assembly.lowerGeometry, assembly.upperGeometry]) {
        const edges = new Map<string, number>();
        const index = mesh.index!.array;
        for (let i=0;i<index.length;i+=3) {
          for (let j=0;j<3;j++) {
            const a=index[i+j], b=index[i+(j+1)%3];
            const key=a<b ? a+':'+b : b+':'+a;
            edges.set(key,(edges.get(key)??0)+1);
          }
        }
        expect([...edges.values()].every(n=>n===2)).toBe(true);
      }
      expect(assembly.lowerGeometry).not.toBe(assembly.upperGeometry);
    } finally {
      assembly.lowerGeometry.dispose();
      assembly.upperGeometry.dispose();
    }
  });

  it('reports radial and diametral clearance', () => {
    const assembly = buildAssembly(options);
    try {
      expect(assembly.fitting.femaleRadius).toBeCloseTo(24.25);
      expect(assembly.fitting.diametralClearance).toBeCloseTo(0.5);
      expect(assembly.fitting.engagement).toBe(6);
    } finally {
      assembly.lowerGeometry.dispose();
      assembly.upperGeometry.dispose();
    }
  });

  it('rejects invalid fitting dimensions', () => {
    expect(()=>buildAssembly({...options,clearance:0})).toThrow();
    expect(()=>buildAssembly({...options,engagement:50})).toThrow();
    expect(()=>buildAssembly({...options,fittingRadius:35})).toThrow();
  });
});
