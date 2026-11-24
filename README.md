# FORMA Studio

A browser-based parametric 3D configurator for designing two-piece rotational assemblies with editable profiles, hollow interiors and dimensioned coaxial fittings.

## Run locally

Requires Node.js 22 and npm.

```sh
npm ci
npm run dev
```

## Workflow

1. Choose a preset or edit the upper and lower profiles using control points.
2. Adjust radial wall thickness, solid base thickness, clearance and engagement.
3. Inspect the assembly, exploded view, individual parts or clipped section.
4. Review mesh topology, dimensions, volume and estimated solid material mass.
5. Export individual binary STL files or a ZIP containing both parts, editable project JSON and a manufacturing report.

Designs are saved locally in the browser. JSON import/export supports portable projects.

## Architecture

- React and TypeScript: editor, project history and manufacturing controls.
- SVG: interactive two-dimensional profile editing.
- Three.js, React Three Fiber and Drei: interactive 3D rendering and camera controls.
- `src/engine/solid.ts`: slope-limited cubic profile sampling and indexed rotational mesh generation.
- `src/engine/assembly.ts`: hollow components, neck transitions and coaxial fitting construction.
- `src/engine/section.ts`: meridian intersection validation.
- `src/engine/inspect.ts`: edge incidence, winding, degenerate triangles, signed volume and bounding dimensions.
- `src/engine/export.ts`: binary STL, ZIP packaging and manufacturing report.
- `src/engine/project.ts`: project validation, history and persistence schema.

## Geometry and manufacturing

All design dimensions are expressed in millimeters. Profiles are sampled along increasing axial heights and revolved into 128 radial segments. Outer and inner meridians, solid floors and fitting shoulders form closed indexed surfaces. The upper component is inverted for assembly; both components export independently in Z-up orientation.

The socket radius equals the male radius plus radial clearance. Diametral clearance is twice radial clearance. The minimum polygon gap accounts for the discretized circular cross-section. Mesh inspection checks directed edge pairing, nondegenerate triangles and positive signed volume. Meridian validation rejects intersecting nonadjacent section edges.

Wall thickness is radial, not a constant normal offset on sloped surfaces. The section view is a visual clipping plane, not a slicer. STL has no intrinsic unit metadata; import as millimeters. Material mass assumes solid material and is not a slicer estimate.

## Validation

```sh
npm run lint
npm run test
npm run build
```

The automated suite contains 22 tests covering profile sampling, closed mesh topology, assembly, fitting clearance, section integrity, manufacturing dimensions, STL and ZIP output, and project history. Local checks passed during development. External slicer and physical print validation remain unperformed; topology checks alone do not certify printability or physical fit.

## Deployment

GitHub Actions runs lint, tests and the production build. Netlify configuration uses Node.js 22, builds with `npm run build` and publishes `dist`. No backend or API credentials are required.

## Scope

This implementation supports axisymmetric two-component designs, not arbitrary freeform CAD or general-purpose slicing.
