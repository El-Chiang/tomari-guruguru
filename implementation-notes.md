# Implementation notes

## 2026-07-16 — HeadPitch phase 1

Implemented the first web HeadPitch pass on top of the existing HeadYaw mesh prototype.

### Key decisions

- `headPitch` stays normalized to `[-1, 1]`, with `-1` meaning up and `1` meaning down.
- The initial `7°` up / `8°` down range passed the first visual gate. The administrator then requested a wider trial, so the current visible range is symmetric at `±15°`.
- HeadYaw and HeadPitch share a pivot near the ear axis and use `YXZ` rotation order.
- Mode A applies the mathematical surface rotation only. Mode B adds per-layer pitch keyforms for the face, features, eyes, hair, ears, and neck seam.
- The animation loop updates the renderer imperatively, so smoothing no longer triggers a React render on every animation frame.
- The visual gate covers neutral, both pitch endpoints, and all four yaw/pitch corner poses with the mesh overlay enabled.

### Deviations

- The plan proposed serializing pitch keyforms in model configuration. This first pass generates the endpoint arrays in `renderer.js`, matching the existing HeadYaw prototype. Keep the public composition helpers data-driven so the endpoint arrays can move into exported model data when art-directed tuning stabilizes.
- The four corner-residual math and tests are implemented, but the current visual gate did not require non-zero corner residuals. They remain zero until a specific diagonal artifact justifies additional authored data.
- The available assets do not contain the underside of the chin or extra neck occlusion art. This originally led to a conservative `7°/8°` range; the administrator explicitly requested a `±15°` trial. The wider range passed the current endpoint and mesh-fold visual checks, but the missing underside art remains the first constraint to revisit if later animation exposes a seam.

## 2026-07-16 — Eye motion and blink composition

- Added a DOM-free motion mixer so pointer gaze, idle saccades, blink envelopes, and future roll/hair/body sources share one parameter contract.
- Pointer gaze takes priority for the configured idle window; random saccades resume only after pointer activity stops.
- Blink timing runs in the render loop without `setTimeout` or per-frame React state, including single, double, and slower blinks.
- Eye motion is applied after HeadYaw/HeadPitch keyforms, so gaze and blink remain local to the already-posed eye meshes.
- The iris fades as the eyelid closes, preventing a coloured iris seam from surviving in the compressed closed-eye pose.
- Pointer Y is inverted at the DOM-to-model boundary while HeadPitch keeps its screen-space direction; horizontal iris travel was increased from `4.5` to `6.5` model units after visual review.
