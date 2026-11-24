import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Download, RotateCcw, Shapes, Ruler, SlidersHorizontal } from 'lucide-react';
import { LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

type ControlPoint = { radius: number; height: number };
const INITIAL: ControlPoint[] = [
  {radius:28,height:0},{radius:43,height:22},{radius:49,height:45},
  {radius:34,height:78},{radius:20,height:108},{radius:33,height:140}
];
const WIDTH=280, HEIGHT=300, PAD=24;
const x=(v:number)=>PAD+v/72*(WIDTH-2*PAD);
const y=(v:number)=>HEIGHT-PAD-v/140*(HEIGHT-2*PAD);

function sample(points: ControlPoint[]) {
  const result: Vector2[]=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)];
    for(let j=0;j<12;j++){
      const t=j/12,t2=t*t,t3=t2*t,h=b.height-a.height;
      const m0=(b.radius-prev.radius)/(b.height-prev.height),m1=(next.radius-a.radius)/(next.height-a.height);
      const r=(2*t3-3*t2+1)*a.radius+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*b.radius+(t3-t2)*h*m1;
      result.push(new Vector2(Math.max(.5,r),a.height+h*t));
    }
  }
  const last=points[points.length-1];result.push(new Vector2(last.radius,last.height));return result;
}
function makeGeometry(points: ControlPoint[],wall:number){
  const curve=sample(points);
  const min=Math.min(...curve.map(p=>p.x));
  if(wall>=min)throw new Error('Wall thickness must be smaller than the narrowest radius.');
  const inner=curve.slice().reverse().map(p=>new Vector2(p.x-wall,p.y));
  const geom=new LatheGeometry([...curve,...inner,curve[0].clone()],96);
  geom.computeVertexNormals();
  return geom;
}
function Model({geometry}:{geometry:LatheGeometry}){
  return <mesh geometry={geometry} position={[0,-70,0]}><meshStandardMaterial color="#aaa0f0" roughness={.3} metalness={.3} side={2}/></mesh>;
}
export default function App(){
  const [points,setPoints]=useState(INITIAL),[wall,setWall]=useState(2.4),[message,setMessage]=useState('');
  const svg=useRef<SVGSVGElement>(null);
  const samples=useMemo(()=>sample(points),[points]);
  const geometry=useMemo(()=>makeGeometry(points,wall),[points,wall]);
  const path=samples.map((p,i)=>(i?'L':'M')+x(p.x)+','+y(p.y)).join(' ');
  function drag(e:PointerEvent<SVGCircleElement>,index:number){
    if(!(e.buttons&1))return;
    const rect=svg.current?.getBoundingClientRect();if(!rect)return;
    const radius=((e.clientX-rect.left)*WIDTH/rect.width-PAD)/(WIDTH-2*PAD)*72;
    setPoints(previous=>previous.map((p,i)=>i===index?{...p,radius:Math.max(wall+1,Math.min(70,radius))}:p));
  }
  function exportStl(){
    const mesh=new Mesh(geometry,new MeshStandardMaterial());mesh.updateMatrixWorld(true);
    const bytes=new STLExporter().parse(mesh,{binary:true});
    const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'model/stl'}));
    const a=document.createElement('a');a.href=url;a.download='forma-preview.stl';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('Preview STL exported; manifold and slicer validation are pending.');
  }
  const diameter=2*Math.max(...points.map(p=>p.radius));
  return <div className="app">
    <header><div className="logo"><span><Shapes size={20}/></span><strong>FORMA <small>STUDIO</small></strong><em>BETA</em></div><div className="project">Untitled Design <b>•</b> Parametric Workspace</div><nav><button onClick={()=>{setPoints(INITIAL);setWall(2.4);setMessage('Design reset.')}}><RotateCcw size={15}/> Reset</button><button className="primary" onClick={exportStl}><Download size={15}/> Export Preview STL</button></nav></header>
    <div className="workspace">
      <aside className="panel left"><div className="kicker"><SlidersHorizontal size={15}/> DESIGN CONTROLS</div><h2>Profile editor</h2><p>Shape the surface in real time.</p><div className="section">01 &nbsp; RADIAL PROFILE <span>6 NODES</span></div>
        <div className="plot"><div className="plotcap">PROFILE / FRONT <span>MM</span></div><svg ref={svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Draggable profile points">
          {Array.from({length:9},(_,i)=><g key={i}><line x1={PAD+i*(WIDTH-2*PAD)/8} x2={PAD+i*(WIDTH-2*PAD)/8} y1={PAD} y2={HEIGHT-PAD} stroke="#293141"/><line x1={PAD} x2={WIDTH-PAD} y1={PAD+i*(HEIGHT-2*PAD)/8} y2={PAD+i*(HEIGHT-2*PAD)/8} stroke="#293141"/></g>)}
          <path d={path} stroke="#a99bff" strokeWidth={2.7} fill="none"/>
          {points.map((p,i)=><g key={i}><line x1={PAD} x2={x(p.radius)} y1={y(p.height)} y2={y(p.height)} stroke="#5f5a8f" strokeDasharray="3 4"/><circle cx={x(p.radius)} cy={y(p.height)} r={6} fill="#c7baff" stroke="#24263b" strokeWidth={2} style={{cursor:'ew-resize',touchAction:'none'}} onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>drag(e,i)}/></g>)}
        </svg><div className="caption">Drag violet points horizontally to reshape.</div></div>
        <div className="section">02 &nbsp; PROFILE DETAILS</div><div className="stats"><div>HEIGHT<strong>140 <small>mm</small></strong></div><div>MAX DIAMETER<strong>{diameter.toFixed(1)} <small>mm</small></strong></div></div><div className="note">Real-time geometry updates as you edit the radial profile.</div></aside>
      <main><div className="viewlabel">PERSPECTIVE <span>LIVE GEOMETRY</span></div><Canvas camera={{position:[180,130,190],fov:43}}><color attach="background" args={['#151923']}/><ambientLight intensity={1.9}/><directionalLight position={[90,130,100]} intensity={3}/><directionalLight position={[-100,60,-50]} intensity={1.4} color="#8888ff"/><Grid position={[0,-71,0]} args={[350,350]} sectionSize={25} cellColor="#2c3444" sectionColor="#3d485d" fadeDistance={400} infiniteGrid/><Model geometry={geometry}/><OrbitControls makeDefault minDistance={90} maxDistance={600}/></Canvas><div className="viewfooter">DRAG TO ROTATE &nbsp; • &nbsp; SCROLL TO ZOOM &nbsp; • &nbsp; RIGHT-DRAG TO PAN</div></main>
      <aside className="panel right"><div className="kicker"><Ruler size={15}/> PARAMETRIC DESIGN</div><h2>Properties</h2><p>Dimensioned design parameters.</p><div className="section">01 &nbsp; MODEL DIMENSIONS</div><label>Height <span>mm</span></label><div className="field">140.0</div><label>Maximum diameter <span>mm</span></label><div className="field">{diameter.toFixed(1)}</div><label>Radial wall thickness <span>{wall.toFixed(1)} mm</span></label><input type="range" min="1" max="8" step=".2" value={wall} onChange={e=>setWall(Number(e.target.value))}/><div className="section">02 &nbsp; VIEW CONTROLS</div><div className="row">Orbit, zoom and pan <span>✓</span></div><div className="row">Hollow lathed preview <span>✓</span></div><div className="section">03 &nbsp; MANUFACTURING</div><div className="warning"><strong>Engineering preview</strong><p>Mesh validation, printable caps, fitting tolerances and separate assembly components are pending. STL is not yet certified for printing.</p></div></aside>
    </div><footer><span>● &nbsp; GEOMETRY ENGINE ACTIVE</span><span>UNITS: MILLIMETERS</span><span>FORMA STUDIO · ENGINEERING PREVIEW</span></footer>
    {message&&<div className="toast" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}
  </div>;
}
