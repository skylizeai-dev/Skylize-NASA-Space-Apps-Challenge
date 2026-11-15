# 3D cabin model: integration contract

The step-by-step setup (`components/SetupWizard.tsx`) shows a picture of the
environment the user is building.

**Status: integrated.** `components/CabinScene.tsx` is the entry point. It
lazy-loads the three.js scene in `components/CabinScene3D.tsx` and keeps the 2D
drawing as the placeholder while that loads and as the fallback without WebGL.
This document is the contract for any further change to the scene.

## What the 3D component must do

**Keep the file and the interface.** Replace the body of
`components/CabinScene.tsx`, keeping its default export and these props:

```ts
type SetupStep = "habitat" | "oxygen" | "pressure" | "airflow" | "material" | "review";

interface CabinSceneProps {
  atmosphere: { oxygen_pct: number; pressure_kpa: number; flow_cm_s: number };
  material: "plastic" | "fabric" | "liquid" | "gas" | "other" | "any";
  step: SetupStep; // the question being answered, to highlight the matching part
  onPick?: (step: SetupStep) => void; // a part was selected: open the step that edits it
}
```

Value ranges the setup can send: oxygen 10–40 % O₂, pressure 30–110 kPa,
airflow 0–50 cm/s.

**Fit the box it is given.** Fill 100 % of the parent's width and height. The
setup sets the box size (150–300 px tall, depending on the window) so the
whole step fits at 100 % zoom. Never set a fixed height.

**React to the props.**

| Prop | Show it as |
|---|---|
| `flow_cm_s` | Airflow direction and strength; nothing moving at 0 ("still air") |
| `material` | The burning sample's form: fabric sheet, plastic slab, droplet, gas burner, or a generic sample for `"any"` |
| `step` | Highlight the part being asked about: the air for oxygen and pressure, the flow for airflow, the sample for material |
| oxygen and pressure | A light visual cue at most. Do not imply flame size, spread rate or any outcome |

## Interaction

| Action | Result |
|---|---|
| Hover a part | Its name appears top left ("Airflow: select to edit") and the cursor changes |
| Select a part | `onPick` opens the step that edits it: sample → material, airflow arrows → airflow, cabin air → oxygen (or pressure when on that step), hull and racks → habitat |
| Drag | Turns the module within limits; a drag never counts as a selection |
| Arrow keys / Home | Turn the module / reset the view, when the scene has focus |
| Reset view | Button bottom right |
| Enlarge | Opens the same scene in a large dialog; selecting a part there closes it and opens the step |

Selection uses invisible pick volumes, so thin parts (arrows, small samples)
are easy to hit.

## Rules (from `briefing.md` and the blueprint)

- **Illustration, not a simulation.** Keep the caption "Illustration, not a
  simulation." visible. Do not model or predict flame behaviour; no numbers in
  the scene that are not in the props.
- **No NASA logos, insignia, mission patches** or copied vehicle artwork.
  A generic pressurised module is fine.
- **Client only and lazy.** Load the 3D library with `next/dynamic` and
  `ssr: false` inside `CabinScene.tsx`, and render the 2D placeholder while it
  loads or if WebGL is unavailable.
- **Light on laptops.** Under ~1 MB of extra JavaScript and assets, no
  continuous animation when idle, and stop animating under
  `prefers-reduced-motion: reduce`.
- **Accessible.** Keep an `aria-label` that describes the scene in words.
- **Theme.** Use the CSS tokens in `app/globals.css` (e.g.
  `var(--color-accent)`, `var(--flame-micro-ring)`) so it matches the light
  glass design.

## Done when

- The setup still fits on a 1366×768 screen at 100 % zoom.
- `npm run lint` and `npm run build` pass.
- Changing any value in the setup visibly updates the scene, with no console errors.
