import { Vector3, type BufferGeometry } from 'three';
export function inspectMesh(geometry: BufferGeometry) {
  const p=geometry.getAttribute('position'), index=geometry.index;
  if(!index) throw new Error('Indexed mesh required');
  const edges=new Map<string,{count:number;direction:number}>();
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),ab=new Vector3(),ac=new Vector3();
  let volume=0,degenerate=0;
  for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
    ab.subVectors(b,a);ac.subVectors(c,a);
    if(ab.cross(ac).lengthSq()<1e-16)degenerate++;
    volume+=a.dot(ab.crossVectors(b,c))/6;
    for(let j=0;j<3;j++){
      const u=ids[j],v=ids[(j+1)%3],key=u<v?u+':'+v:v+':'+u;
      const edge=edges.get(key)??{count:0,direction:0};
      edge.count++;edge.direction+=u<v?1:-1;edges.set(key,edge);
    }
  }
  const invalidEdges=[...edges.values()].filter(e=>e.count!==2||e.direction!==0).length;
  geometry.computeBoundingBox();
  const size=geometry.boundingBox!.getSize(new Vector3());
  return {triangles:index.count/3,volumeCm3:volume/1000,degenerate,invalidEdges,height:size.y,diameter:Math.max(size.x,size.z),valid:invalidEdges===0&&degenerate===0&&Number.isFinite(volume)&&volume>0};
}
