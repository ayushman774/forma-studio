import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Bounds, useBounds } from "@react-three/drei";
import {
  Download,
  RotateCcw,
  Shapes,
  Ruler,
  Box,
  Layers,
  ArrowUp,
  ArrowDown,
  Grid3X3,
  Scissors,
  Maximize,
  Undo2,
  Redo2,
  Upload,
  FileJson,
  X,
} from "lucide-react";
import { Plane, Vector3 } from "three";
import { binaryStl, manufacturingReport, zipFiles } from "./engine/export";
import {
  change,
  undo,
  redo,
  restore,
  storageKey,
  type Design,
  type History,
} from "./engine/project";
import { inspectMesh } from "./engine/inspect";
import { buildAssembly } from "./engine/assembly";
import { sampleProfile, type ProfilePoint } from "./engine/solid";

function CameraFit({ request, view }: { request: number; view: string }) {
  const bounds = useBounds();
  const { camera } = useThree();
  useEffect(() => {
    if (!request) return;
    const direction =
      view === "front"
        ? [0, 0, 1]
        : view === "side"
          ? [1, 0, 0]
          : view === "top"
            ? [0, 1, 0.001]
            : [1, 0.55, 1];
    camera.position
      .set(...(direction as [number, number, number]))
      .multiplyScalar(250);
    camera.lookAt(0, 0, 0);
    bounds.refresh().clip().fit();
  }, [request, view, bounds, camera]);
  return null;
}
const LOWER = [
  { radius: 32, height: 0 },
  { radius: 44, height: 20 },
  { radius: 40, height: 45 },
  { radius: 32, height: 70 },
];
const UPPER = [
  { radius: 32, height: 0 },
  { radius: 40, height: 20 },
  { radius: 28, height: 45 },
  { radius: 20, height: 65 },
];
const W = 280,
  H = 210,
  P = 20;
function Editor({
  points,
  onChange,
  color,
  name,
  minRadius,
  rimIndex,
  wall,
  onBegin,
  onEnd,
}: {
  points: ProfilePoint[];
  onChange: (p: ProfilePoint[]) => void;
  color: string;
  name: string;
  minRadius: number;
  rimIndex: number;
  wall: number;
  onBegin: () => void;
  onEnd: () => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, points.length - 1);
  const node = points[active];
  const minimum = (i: number) => (i === rimIndex ? minRadius : wall + 1);
  function edit(radius: number, height: number) {
    if (!Number.isFinite(radius) || !Number.isFinite(height)) return;
    onChange(
      points.map((p, i) =>
        i === active
          ? {
              radius: Math.max(minimum(i), Math.min(70, radius)),
              height:
                i === 0 || i === points.length - 1
                  ? p.height
                  : Math.max(
                      points[i - 1].height + 2,
                      Math.min(points[i + 1].height - 2, height),
                    ),
            }
          : p,
      ),
    );
  }
  function add() {
    const i = Math.min(active, points.length - 2),
      a = points[i],
      b = points[i + 1];
    if (b.height - a.height < 4 || points.length >= 20) return;
    onChange([
      ...points.slice(0, i + 1),
      { radius: (a.radius + b.radius) / 2, height: (a.height + b.height) / 2 },
      ...points.slice(i + 1),
    ]);
    setSelected(i + 1);
  }
  function remove() {
    if (active === 0 || active === points.length - 1 || points.length <= 3)
      return;
    onChange(points.filter((_, i) => i !== active));
    setSelected(active - 1);
  }
  const height = points.at(-1)!.height;
  const x = (r: number) => P + (r / 72) * (W - 2 * P);
  const y = (h: number) => H - P - (h / height) * (H - 2 * P);
  const path = sampleProfile(points)
    .map((p, i) => (i ? "L" : "M") + x(p.radius) + "," + y(p.height))
    .join(" ");
  return (
    <div className="plot">
      <div className="plotcap">
        {name}
        <span>MM</span>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} aria-label={name}>
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <line
              x1={P + (i * (W - 2 * P)) / 8}
              x2={P + (i * (W - 2 * P)) / 8}
              y1={P}
              y2={H - P}
              stroke="#293141"
            />
            <line
              x1={P}
              x2={W - P}
              y1={P + (i * (H - 2 * P)) / 8}
              y2={P + (i * (H - 2 * P)) / 8}
              stroke="#293141"
            />
          </g>
        ))}
        {[0, 18, 36, 54, 72].map((r) => (
          <text
            key={r}
            x={x(r)}
            y={H - 4}
            textAnchor="middle"
            fill="#8792a8"
            fontSize="9"
          >
            {r}
          </text>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text
            key={t}
            x={P - 3}
            y={y(t * height) + 3}
            textAnchor="end"
            fill="#8792a8"
            fontSize="8"
          >
            {Math.round(t * height)}
          </text>
        ))}
        <path d={path} stroke={color} strokeWidth={2.5} fill="none" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(p.radius)}
            cy={y(p.height)}
            r={i === active ? 7 : 5}
            fill={color}
            stroke="#24263b"
            strokeWidth={2}
            style={{ cursor: "move", touchAction: "none" }}
            onPointerDown={(e) => {
              onBegin();
              setSelected(i);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={onEnd}
            onPointerCancel={onEnd}
            onLostPointerCapture={onEnd}
            onPointerMove={(e) => {
              if (!(e.buttons & 1)) return;
              const svg = ref.current!;
              const matrix = svg.getScreenCTM();
              if (!matrix) return;
              const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
                matrix.inverse(),
              );
              const radius = Math.max(
                minimum(i),
                Math.min(70, ((p.x - P) / (W - 2 * P)) * 72),
              );
              const h = (height * (H - P - p.y)) / (H - 2 * P);
              onChange(
                points.map((q, j) =>
                  j !== i
                    ? q
                    : {
                        radius,
                        height:
                          i === 0 || i === points.length - 1
                            ? q.height
                            : Math.max(
                                points[i - 1].height + 2,
                                Math.min(points[i + 1].height - 2, h),
                              ),
                      },
                ),
              );
            }}
          />
        ))}
      </svg>
      <div className="node-tools">
        <select
          aria-label={name + " selected node"}
          value={active}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {points.map((_, i) => (
            <option key={i} value={i}>
              Node {i + 1}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={
            points.length >= 20 ||
            points[Math.min(active, points.length - 2) + 1].height -
              points[Math.min(active, points.length - 2)].height <
              4
          }
          title="Insert node"
        >
          +
        </button>
        <button
          onClick={remove}
          disabled={
            active === 0 || active === points.length - 1 || points.length <= 3
          }
          title="Remove node"
        >
          −
        </button>
      </div>
      <div className="node-fields">
        <label>
          Radius (mm)
          <input
            type="number"
            step=".1"
            min={minimum(active)}
            max={70}
            value={Number(node.radius.toFixed(2))}
            onChange={(e) => {
              if (e.target.value !== "")
                edit(Number(e.target.value), node.height);
            }}
          />
        </label>
        <label>
          Height (mm)
          <input
            type="number"
            step=".1"
            disabled={active === 0 || active === points.length - 1}
            value={Number(node.height.toFixed(2))}
            onChange={(e) => {
              if (e.target.value !== "")
                edit(node.radius, Number(e.target.value));
            }}
          />
        </label>
      </div>
    </div>
  );
}
export default function App() {
  const defaults: Design = {
    name: "Untitled Design",
    lower: LOWER,
    upper: UPPER,
    wall: 2,
    floor: 3,
    clearance: 0.25,
    engagement: 6,
  };
  const [history, setHistory] = useState<History>(() => {
    let present = defaults;
    try {
      present = restore(localStorage.getItem(storageKey), defaults);
    } catch {
      /* storage unavailable */
    }
    return { past: [], present, future: [] };
  });
  const { lower, upper, wall, floor, clearance, engagement, name } =
    history.present;
  const [saveStatus, setSaveStatus] = useState("Saving…");
  const gesture = useRef<{ started: boolean } | null>(null);
  function begin() {
    gesture.current = { started: false };
  }
  function end() {
    gesture.current = null;
  }
  function patch(p: Partial<Design>) {
    const g = gesture.current;
    const merge = !!g?.started;
    if (g) g.started = true;
    setHistory((h) =>
      merge
        ? { ...h, present: { ...h.present, ...p }, future: [] }
        : change(h, p),
    );
  }
  const setLower = (lower: Design["lower"]) => patch({ lower }),
    setUpper = (upper: Design["upper"]) => patch({ upper });
  const setWall = (wall: number) => patch({ wall }),
    setFloor = (floor: number) => patch({ floor }),
    setClearance = (clearance: number) => patch({ clearance }),
    setEngagement = (engagement: number) => patch({ engagement });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(history.present));
      setSaveStatus("Saved locally");
    } catch {
      setSaveStatus("Local save unavailable");
    }
  }, [history.present]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.altKey ||
        e.key.toLowerCase() !== "z" ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,[contenteditable=true]"))
      )
        return;
      e.preventDefault();
      setHistory(e.shiftKey ? redo : undo);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const selectedPreset =
    (
      [
        ["classic", LOWER, UPPER],
        [
          "column",
          LOWER.map((p) => ({ ...p, radius: 34 })),
          UPPER.map((p) => ({ ...p, radius: 34 })),
        ],
        [
          "taper",
          LOWER.map((p, i) => ({ ...p, radius: [42, 39, 35, 32][i] })),
          UPPER.map((p, i) => ({ ...p, radius: [32, 34, 29, 23][i] })),
        ],
      ] as const
    ).find(
      ([, l, u]) =>
        JSON.stringify(l) === JSON.stringify(lower) &&
        JSON.stringify(u) === JSON.stringify(upper),
    )?.[0] ?? "custom";
  function preset(id: string) {
    if (id === "classic") patch({ lower: LOWER, upper: UPPER });
    else if (id === "column")
      patch({
        lower: LOWER.map((p) => ({ ...p, radius: 34 })),
        upper: UPPER.map((p) => ({ ...p, radius: 34 })),
      });
    else if (id === "taper")
      patch({
        lower: LOWER.map((p, i) => ({ ...p, radius: [42, 39, 35, 32][i] })),
        upper: UPPER.map((p, i) => ({ ...p, radius: [32, 34, 29, 23][i] })),
      });
  }

  const [mode, setMode] = useState("assembled"),
    [gap, setGap] = useState(30),
    [wireframe, setWireframe] = useState(false),
    [section, setSection] = useState(false),
    [message, setMessage] = useState(""),
    [cameraView, setCameraView] = useState("iso"),
    [fitRequest, setFitRequest] = useState(0),
    [dimensions, setDimensions] = useState(true);
  const [material, setMaterial] = useState("PLA");
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [exportOpen]);
  const densities: Record<string, number> = {
    PLA: 1.24,
    PETG: 1.27,
    ABS: 1.04,
    TPU: 1.21,
  };
  const fittingRadius = 24;
  const result = useMemo(() => {
    try {
      return {
        assembly: buildAssembly({
          lower,
          upper,
          wall,
          floor,
          clearance,
          engagement,
          fittingRadius,
        }),
        error: "",
      };
    } catch (e) {
      return {
        assembly: null,
        error: e instanceof Error ? e.message : "Invalid geometry",
      };
    }
  }, [lower, upper, wall, floor, clearance, engagement]);
  const assembly = result.assembly;
  const clipping = useMemo(() => [new Plane(new Vector3(1, 0, 0), 0)], []);
  const stats = useMemo(
    () =>
      assembly
        ? [
            inspectMesh(assembly.lowerGeometry),
            inspectMesh(assembly.upperGeometry),
          ]
        : null,
    [assembly],
  );
  useEffect(
    () => () => {
      assembly?.lowerGeometry.dispose();
      assembly?.upperGeometry.dispose();
    },
    [assembly],
  );
  function saveProject() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version: 1, design: history.present }, null, 2)],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = (name.replace(/[^a-z0-9_-]/gi, "-") || "forma") + ".json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProject(file: File) {
    try {
      if (file.size > 100000) throw new Error("Project file too large");
      const data = JSON.parse(await file.text());
      if (data.version !== 1) throw new Error("Unsupported project version");
      const design = restore(JSON.stringify(data.design), defaults);
      if (design === defaults) throw new Error("Invalid project data");
      const candidate = buildAssembly({ ...design, fittingRadius });
      candidate.lowerGeometry.dispose();
      candidate.upperGeometry.dispose();
      patch(design);
      setMessage("Project imported successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed");
    }
  }
  function download(part: "lower" | "upper") {
    if (!assembly || !stats?.[part === "lower" ? 0 : 1].valid) return;
    const bytes = binaryStl(
      part === "lower" ? assembly.lowerGeometry : assembly.upperGeometry,
    );
    const url = URL.createObjectURL(
      new Blob([bytes as BlobPart], { type: "model/stl" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "forma-" + part + ".stl";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(part + " component exported. Slicer validation pending.");
  }
  function downloadPackage() {
    if (!assembly || !stats?.every((s) => s.valid)) return;
    try {
      const enc = new TextEncoder();
      const bytes = zipFiles({
        "forma-lower.stl": binaryStl(assembly.lowerGeometry),
        "forma-upper.stl": binaryStl(assembly.upperGeometry),
        "project.json": enc.encode(
          JSON.stringify({ version: 1, design: history.present }, null, 2),
        ),
        "manufacturing-report.json": enc.encode(
          manufacturingReport(
            history.present,
            material,
            densities[material],
            stats,
          ),
        ),
      });
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/zip" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "forma-manufacturing.zip";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Manufacturing package exported.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed");
    }
  }
  function reset() {
    patch({ ...defaults, name });
    setMode("assembled");
    setGap(30);
    setWireframe(false);
    setSection(false);
    setCameraView("iso");
    setFitRequest((v) => v + 1);
    setDimensions(true);
  }
  const controls = [
    {
      name: "Radial wall",
      value: wall,
      min: 1,
      max: 5,
      step: 0.2,
      set: setWall,
    },
    {
      name: "Solid base",
      value: floor,
      min: 1,
      max: 8,
      step: 0.5,
      set: setFloor,
    },
    {
      name: "Radial clearance",
      value: clearance,
      min: 0.1,
      max: 1,
      step: 0.05,
      set: setClearance,
    },
    {
      name: "Engagement",
      value: engagement,
      min: 2,
      max: 12,
      step: 1,
      set: setEngagement,
    },
  ];
  return (
    <div className="app">
      <header>
        <div className="logo">
          <span>
            <Shapes size={20} />
          </span>
          <strong>
            FORMA <small>STUDIO</small>
          </strong>
          <em>BETA</em>
        </div>
        <div className="project">
          <input
            aria-label="Project name"
            maxLength={100}
            value={name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <small>{saveStatus}</small>
        </div>
        <nav>
          <button
            title="Undo (Ctrl+Z)"
            disabled={!history.past.length}
            onClick={() => setHistory(undo)}
          >
            <Undo2 size={15} />
          </button>
          <button
            title="Redo (Ctrl+Shift+Z)"
            disabled={!history.future.length}
            onClick={() => setHistory(redo)}
          >
            <Redo2 size={15} />
          </button>
          <button onClick={reset}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="primary" onClick={() => setExportOpen(true)}>
            <Download size={15} /> Export STL
          </button>
        </nav>
      </header>
      <div className="workspace">
        <aside className="panel left">
          <div className="kicker">DESIGN CONTROLS</div>
          <h2>Profile editors</h2>
          <p>Independent parametric components</p>
          <select
            className="field preset-picker"
            aria-label="Design preset"
            value={selectedPreset}
            onChange={(e) => preset(e.target.value)}
          >
            <option value="custom" disabled>
              Custom design
            </option>
            <option value="classic">Classic</option>
            <option value="column">Column</option>
            <option value="taper">Taper</option>
          </select>
          <div className="section">01 · UPPER COMPONENT</div>
          <Editor
            points={upper}
            onChange={setUpper}
            color="#b7a5ff"
            name="UPPER PROFILE"
            minRadius={fittingRadius + wall + clearance + 1}
            rimIndex={0}
            wall={wall}
            onBegin={begin}
            onEnd={end}
          />
          <div className="section">02 · LOWER COMPONENT</div>
          <Editor
            points={lower}
            onChange={setLower}
            color="#79b9fa"
            name="LOWER PROFILE"
            minRadius={fittingRadius + wall + 1}
            rimIndex={lower.length - 1}
            wall={wall}
            onBegin={begin}
            onEnd={end}
          />
        </aside>
        <main>
          <div className="viewlabel">
            {cameraView.toUpperCase()} VIEW{" "}
            <span>{assembly ? "LIVE ASSEMBLY" : "INVALID DESIGN"}</span>
          </div>
          <div className="viewport-tools" aria-label="Viewport controls">
            {[
              { id: "assembled", label: "Assembly", Icon: Box },
              { id: "exploded", label: "Exploded", Icon: Layers },
              { id: "upper", label: "Upper", Icon: ArrowUp },
              { id: "lower", label: "Lower", Icon: ArrowDown },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                title={label}
                aria-pressed={mode === id}
                className={mode === id ? "active" : ""}
                onClick={() => setMode(id)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
            <button
              title="Wireframe"
              aria-pressed={wireframe}
              className={wireframe ? "active" : ""}
              onClick={() => setWireframe((v) => !v)}
            >
              <Grid3X3 size={15} />
              <span>Wireframe</span>
            </button>
            <button
              title="Cross-section"
              aria-pressed={section}
              className={section ? "active" : ""}
              onClick={() => setSection((v) => !v)}
            >
              <Scissors size={15} />
              <span>Section</span>
            </button>
          </div>
          <Canvas
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true;
            }}
            camera={{ position: [195, 107, 220], fov: 40 }}
          >
            <color attach="background" args={["#151923"]} />
            <ambientLight intensity={1.8} />
            <directionalLight position={[90, 130, 100]} intensity={3} />
            <Grid
              position={[0, -70, 0]}
              args={[350, 350]}
              sectionSize={25}
              cellColor="#2c3444"
              sectionColor="#3d485d"
              fadeDistance={400}
              infiniteGrid
            />
            <Bounds margin={1.65}>
              {assembly && (
                <group position={[0, -69, 0]}>
                  {mode !== "upper" && (
                    <mesh geometry={assembly.lowerGeometry}>
                      <meshStandardMaterial
                        color="#79b9fa"
                        roughness={0.35}
                        metalness={0.2}
                        wireframe={wireframe}
                        clippingPlanes={section ? clipping : []}
                        side={section ? 2 : 0}
                      />
                    </mesh>
                  )}
                  {mode !== "lower" && (
                    <mesh
                      geometry={assembly.upperGeometry}
                      rotation={[Math.PI, 0, 0]}
                      position={[
                        0,
                        assembly.upperAssemblyY +
                          (mode === "exploded" ? gap : 0),
                        0,
                      ]}
                    >
                      <meshStandardMaterial
                        color="#b7a5ff"
                        roughness={0.35}
                        metalness={0.2}
                        wireframe={wireframe}
                        clippingPlanes={section ? clipping : []}
                        side={section ? 2 : 0}
                      />
                    </mesh>
                  )}
                </group>
              )}
              <CameraFit request={fitRequest} view={cameraView} />
            </Bounds>
            <OrbitControls makeDefault minDistance={70} maxDistance={650} />
          </Canvas>
          <div className="camera-tools">
            <select
              aria-label="Camera view"
              value={cameraView}
              onChange={(e) => {
                setCameraView(e.target.value);
                setFitRequest((v) => v + 1);
              }}
            >
              <option value="iso">Isometric</option>
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="top">Top</option>
            </select>
            <button
              onClick={() => setFitRequest((v) => v + 1)}
              title="Fit to view"
            >
              <Maximize size={14} /> Fit
            </button>
            <button
              aria-pressed={dimensions}
              onClick={() => setDimensions((v) => !v)}
            >
              <Ruler size={14} /> Dimensions
            </button>
          </div>
          {dimensions && stats && assembly && (
            <div className="dimension-overlay">
              <span>
                HEIGHT{" "}
                <b>
                  {(mode === "lower"
                    ? stats[0].height
                    : mode === "upper"
                      ? stats[1].height
                      : assembly.upperAssemblyY +
                        (mode === "exploded" ? gap : 0)
                  ).toFixed(1)}{" "}
                  mm
                </b>
              </span>
              <span>
                MAX Ø{" "}
                <b>
                  {(mode === "lower"
                    ? stats[0].diameter
                    : mode === "upper"
                      ? stats[1].diameter
                      : Math.max(stats[0].diameter, stats[1].diameter)
                  ).toFixed(1)}{" "}
                  mm
                </b>
              </span>
            </div>
          )}
          <div className="viewfooter">ROTATE · ZOOM · PAN</div>
        </main>
        <aside className="panel right">
          <div className="kicker">
            <Ruler size={15} /> PARAMETRIC DESIGN
          </div>
          <h2>Properties</h2>
          <div className="section">01 · DIMENSIONS</div>
          {controls.map((c) => (
            <div key={c.name}>
              <label>
                {c.name}
                <span>{c.value.toFixed(2)} mm</span>
              </label>
              <input
                type="range"
                onPointerDown={begin}
                onPointerUp={end}
                onPointerCancel={end}
                onBlur={end}
                min={c.min}
                max={c.max}
                step={c.step}
                value={c.value}
                onChange={(e) => c.set(Number(e.target.value))}
              />
            </div>
          ))}
          <div className="field">
            Male Ø 48 mm · Socket Ø {(48 + 2 * clearance).toFixed(2)} mm
          </div>
          <div className="section">02 · VIEW MODE</div>
          <select
            className="field"
            style={{ width: "100%", color: "inherit" }}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="assembled">Assembled</option>
            <option value="exploded">Exploded</option>
            <option value="upper">Upper only</option>
            <option value="lower">Lower only</option>
          </select>
          {mode === "exploded" && (
            <>
              <label>
                Separation <span>{gap} mm</span>
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
              />
            </>
          )}
          <div className="section">03 · MANUFACTURING</div>
          <select
            className="field"
            aria-label="Material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            {Object.keys(densities).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <div className="field" aria-live="polite">
            {material} · Density {densities[material].toFixed(2)} g/cm³
          </div>
          {stats && (
            <div className="stats" aria-live="polite">
              {stats.map((s, i) => (
                <div key={i}>
                  {i === 0 ? "LOWER" : "UPPER"}
                  <strong>
                    {(s.volumeCm3 * densities[material]).toFixed(2)} <small>g</small>
                  </strong>
                  <p>
                    {s.volumeCm3.toFixed(2)} cm³ · Ø{" "}
                    {s.diameter.toFixed(1)} mm
                  </p>
                  <p>
                    {material} · estimated solid mass
                  </p>
                  <p>{s.triangles.toLocaleString()} triangles</p>
                  <p>
                    {s.valid ? "Topology checks passed" : "Mesh checks failed"}
                  </p>
                </div>
              ))}
            </div>
          )}
          {assembly && (
            <div className="fit-status">
              <strong>✓ Coaxial fitting verified</strong>
              <span>
                Minimum polygon gap: {assembly.fit.polygonGap.toFixed(3)} mm
              </span>
              <span>
                Engagement: {assembly.fit.overlapHeight.toFixed(1)} mm ·
                shoulder contact
              </span>
            </div>
          )}
          <div className="warning">
            <strong>{result.error || "Engineering preview"}</strong>
            <p>
              Meridian checks enabled. Physical fit and slicer validation
              pending.
            </p>
          </div>
        </aside>
      </div>
      <footer>
        <span>● GEOMETRY ENGINE</span>
        <span>UNITS: MILLIMETERS</span>
        <span>FORMA STUDIO</span>
      </footer>
      {exportOpen && (
        <div
          className="export-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportOpen(false);
          }}
        >
          <section
            className="export-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Export STL"
          >
            <div className="export-heading">
              <h2>Export manufacturing files</h2>
              <button
                className="export-close"
                aria-label="Close export dialog"
                onClick={() => setExportOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p>Binary STL · millimeters · Z-up</p>
            <p>
              Topology checks do not establish print readiness. Verify in a
              slicer.
            </p>
            {stats?.map((s, i) => (
              <div className="export-part" key={i}>
                <span>
                  {i === 0 ? "Lower" : "Upper"} · {s.volumeCm3.toFixed(1)} cm³ ·{" "}
                  {s.valid ? "Topology passed" : "Invalid mesh"}
                </span>
                <button
                  disabled={!s.valid}
                  onClick={() => download(i === 0 ? "lower" : "upper")}
                >
                  <Download size={14} /> Download STL
                </button>
              </div>
            ))}
            <div className="export-part">
              <button
                className="package-button"
                disabled={!stats?.every((s) => s.valid)}
                onClick={downloadPackage}
              >
                <Download size={15} /> Download all (ZIP)
              </button>
            </div>
            <div className="export-part">
              <button onClick={saveProject}>
                <FileJson size={15} /> Save project JSON
              </button>
              <label className="project-import">
                <Upload size={15} /> Import project
                <input
                  aria-label="Import project JSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importProject(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="export-footer">
              <button onClick={() => setExportOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
    </div>
  );
}
