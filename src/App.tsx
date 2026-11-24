import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Download, RotateCcw, Shapes, Ruler, Box, Layers, ArrowUp, ArrowDown, Grid3X3, Scissors } from 'lucide-react';
import { Mesh, MeshStandardMaterial, Plane, Vector3 } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { inspectMesh } from './engine/inspect';
import { buildAssembly } from './engine/assembly';
import { sampleProfile, type ProfilePoint } from './engine/solid';

const LOWER=[{radius:32,height:0},{radius:44,height:20},{radius:40,height:45},{radius:32,height:70}];
const UPPER=[{radius:32,height:0},{radius:40,height:20},{radius:28,height:45},{radius:20,height:65}];
const W=280,H=210,P=20;
function Editor({points,onChange,color,name,minRadius}:{points:ProfilePoint[];onChange:(p:ProfilePoint[])=>void;color:string;name:string;minRadius:number}){
  const ref=useRef<SVGSVGElement>(null);
  const height=points.at(-1)!.height;
  const x=(r:number)=>P+r/72*(W-2*P);
  const y=(h:number)=>H-P-h/height*(H-2*P);
  const path=sampleProfile(points).map((p,i)=>(i?'L':'M')+x(p.radius)+','+y(p.height)).join(' ');
  return <div className="plot"><div className="plotcap">{name}<span>MM</span></div><svg ref={ref} viewBox={`0 0 ${W} ${H}`} aria-label={name}>
    {Array.from({length:9},(_,i)=><g key={i}><line x1={P+i*(W-2*P)/8} x2={P+i*(W-2*P)/8} y1={P} y2={H-P} stroke="#293141"/><line x1={P} x2={W-P} y1={P+i*(H-2*P)/8} y2={P+i*(H-2*P)/8} stroke="#293141"/></g>)}
    <path d={path} stroke={color} strokeWidth={2.5} fill="none"/>
    {points.map((p,i)=><circle key={i} cx={x(p.radius)} cy={y(p.height)} r={6} fill={color} stroke="#24263b" strokeWidth={2} style={{cursor:'move',touchAction:'none'}} onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>{
      if(!(e.buttons&1))return;
      const rect=ref.current!.getBoundingClientRect();
      const radius=Math.max(minRadius,Math.min(70,((e.clientX-rect.left)*W/rect.width-P)/(W-2*P)*72));
      const h=height*(H-P-(e.clientY-rect.top)*H/rect.height)/(H-2*P);
      onChange(points.map((q,j)=>j!==i?q:{radius,height:i===0||i===points.length-1?q.height:Math.max(points[i-1].height+2,Math.min(points[i+1].height-2,h))}));
    }}/>)}
  </svg><div className="caption">Drag nodes to reshape the profile.</div></div>;
}
export default function App(){
  const [lower,setLower]=useState(LOWER),[upper,setUpper]=useState(UPPER);
  const [wall,setWall]=useState(2),[floor,setFloor]=useState(3),[clearance,setClearance]=useState(.25),[engagement,setEngagement]=useState(6);
  const [mode,setMode]=useState('assembled'),[gap,setGap]=useState(30),[wireframe,setWireframe]=useState(false),[section,setSection]=useState(false),[message,setMessage]=useState('');
  const fittingRadius=24;
  const result=useMemo(()=>{
    try{return {assembly:buildAssembly({lower,upper,wall,floor,clearance,engagement,fittingRadius}),error:''};}
    catch(e){return {assembly:null,error:e instanceof Error?e.message:'Invalid geometry'};}
  },[lower,upper,wall,floor,clearance,engagement]);
  const assembly=result.assembly;
  const clipping=useMemo(()=>[new Plane(new Vector3(1,0,0),0)],[]);
  const stats=useMemo(()=>assembly?[inspectMesh(assembly.lowerGeometry),inspectMesh(assembly.upperGeometry)]:null,[assembly]);
  useEffect(()=>()=>{assembly?.lowerGeometry.dispose();assembly?.upperGeometry.dispose();},[assembly]);
  function download(part:'lower'|'upper'){
    if(!assembly)return;
    const material=new MeshStandardMaterial();
    const mesh=new Mesh(part==='lower'?assembly.lowerGeometry:assembly.upperGeometry,material);
    mesh.rotation.x=Math.PI/2;mesh.updateMatrixWorld(true);
    const bytes=new STLExporter().parse(mesh,{binary:true});
    material.dispose();
    const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'model/stl'}));
    const a=document.createElement('a');a.href=url;a.download='forma-'+part+'.stl';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage(part+' component exported. Slicer validation pending.');
  }
  function reset(){setLower(LOWER);setUpper(UPPER);setWall(2);setFloor(3);setClearance(.25);setEngagement(6);setMode('assembled');setGap(30);setWireframe(false);setSection(false);}
  const controls=[{name:'Radial wall',value:wall,min:1,max:5,step:.2,set:setWall},{name:'Solid base',value:floor,min:1,max:8,step:.5,set:setFloor},{name:'Radial clearance',value:clearance,min:.1,max:1,step:.05,set:setClearance},{name:'Engagement',value:engagement,min:2,max:12,step:1,set:setEngagement}];
  return <div className="app"><header><div className="logo"><span><Shapes size={20}/></span><strong>FORMA <small>STUDIO</small></strong><em>BETA</em></div><div className="project">Untitled Design · Assembly Workspace</div><nav><button onClick={reset}><RotateCcw size={15}/> Reset</button><button disabled={!assembly} onClick={()=>download('lower')}><Download size={15}/> Lower STL</button><button disabled={!assembly} className="primary" onClick={()=>download('upper')}><Download size={15}/> Upper STL</button></nav></header>
  <div className="workspace"><aside className="panel left"><div className="kicker">DESIGN CONTROLS</div><h2>Profile editors</h2><p>Independent parametric components</p><div className="section">01 · UPPER COMPONENT</div><Editor points={upper} onChange={setUpper} color="#b7a5ff" name="UPPER PROFILE" minRadius={fittingRadius+wall+clearance+1}/><div className="section">02 · LOWER COMPONENT</div><Editor points={lower} onChange={setLower} color="#79b9fa" name="LOWER PROFILE" minRadius={fittingRadius+wall+1}/></aside>
  <main><div className="viewlabel">PERSPECTIVE <span>{assembly?'LIVE ASSEMBLY':'INVALID DESIGN'}</span></div><div className="viewport-tools" aria-label="Viewport controls">{[{id:'assembled',label:'Assembly',Icon:Box},{id:'exploded',label:'Exploded',Icon:Layers},{id:'upper',label:'Upper',Icon:ArrowUp},{id:'lower',label:'Lower',Icon:ArrowDown}].map(({id,label,Icon})=><button key={id} title={label} aria-pressed={mode===id} className={mode===id?'active':''} onClick={()=>setMode(id)}><Icon size={15}/><span>{label}</span></button>)}<button title="Wireframe" aria-pressed={wireframe} className={wireframe?'active':''} onClick={()=>setWireframe(v=>!v)}><Grid3X3 size={15}/><span>Wireframe</span></button><button title="Cross-section" aria-pressed={section} className={section?'active':''} onClick={()=>setSection(v=>!v)}><Scissors size={15}/><span>Section</span></button></div><Canvas onCreated={({gl})=>{gl.localClippingEnabled=true;}} camera={{position:[155,85,175],fov:40}}><color attach="background" args={['#151923']}/><ambientLight intensity={1.8}/><directionalLight position={[90,130,100]} intensity={3}/><Grid position={[0,-70,0]} args={[350,350]} sectionSize={25} cellColor="#2c3444" sectionColor="#3d485d" fadeDistance={400} infiniteGrid/>{assembly&&<group position={[0,-69,0]}>{mode!=='upper'&&<mesh geometry={assembly.lowerGeometry}><meshStandardMaterial color="#79b9fa" roughness={.35} metalness={.2} wireframe={wireframe} clippingPlanes={section?clipping:[]} side={section?2:0}/></mesh>}{mode!=='lower'&&<mesh geometry={assembly.upperGeometry} rotation={[Math.PI,0,0]} position={[0,assembly.upperAssemblyY+(mode==='exploded'?gap:0),0]}><meshStandardMaterial color="#b7a5ff" roughness={.35} metalness={.2} wireframe={wireframe} clippingPlanes={section?clipping:[]} side={section?2:0}/></mesh>}</group>}<OrbitControls makeDefault minDistance={70} maxDistance={650}/></Canvas><div className="viewfooter">ROTATE · ZOOM · PAN</div></main>
  <aside className="panel right"><div className="kicker"><Ruler size={15}/> PARAMETRIC DESIGN</div><h2>Properties</h2><div className="section">01 · DIMENSIONS</div>{controls.map(c=><div key={c.name}><label>{c.name}<span>{c.value.toFixed(2)} mm</span></label><input type="range" min={c.min} max={c.max} step={c.step} value={c.value} onChange={e=>c.set(Number(e.target.value))}/></div>)}<div className="field">Male Ø 48 mm · Socket Ø {(48+2*clearance).toFixed(2)} mm</div><div className="section">02 · VIEW MODE</div><select className="field" style={{width:'100%',color:'inherit'}} value={mode} onChange={e=>setMode(e.target.value)}><option value="assembled">Assembled</option><option value="exploded">Exploded</option><option value="upper">Upper only</option><option value="lower">Lower only</option></select>{mode==='exploded'&&<><label>Separation <span>{gap} mm</span></label><input type="range" min="10" max="80" value={gap} onChange={e=>setGap(Number(e.target.value))}/></>}<div className="section">03 · MANUFACTURING</div>{stats&&<div className="stats">{stats.map((s,i)=><div key={i}>{i===0?'LOWER':'UPPER'}<strong>{s.volumeCm3.toFixed(1)} <small>cm³</small></strong><p>{s.triangles.toLocaleString()} triangles · Ø {s.diameter.toFixed(1)} mm</p><p>{s.valid?'Topology checks passed':'Mesh checks failed'}</p></div>)}</div>}<div className="warning"><strong>{result.error||'Engineering preview'}</strong><p>Physical fit, self-intersection and slicer validation pending.</p></div></aside></div><footer><span>● GEOMETRY ENGINE</span><span>UNITS: MILLIMETERS</span><span>FORMA STUDIO</span></footer>{message&&<div className="toast" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}</div>;
}
