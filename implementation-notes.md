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

## 2026-07-16 — HeadRoll composition

- Added normalized `headRoll` to the shared parameter controller and applied it to the existing head group after yaw/pitch.
- Automatic roll ports guruguru's default `±4° / 4s` idle tilt and remains adjustable up to `8°`.
- A manual HeadRoll slider pauses the automatic source; re-enabling automatic roll resets the manual offset to avoid competing controls.
- HeadRoll uses a nested transform group with its own pivot at the chin tip (`489, 570` in model-image coordinates); yaw/pitch keep the existing ear-axis pivot.

## 2026-07-16 — Hair secondary motion

- Ported the original `2° / 3.6s` hair motion with the existing front/back/accessory amplitude ratios and phase offsets.
- The mesh version keeps crown vertices almost fixed and increases displacement toward the tips instead of rotating each full-canvas layer as a rigid card.
- Back hair and the accessory have their own motion parameters, and all three layers add a small counter-motion from HeadRoll to produce visible lag in composite poses.

## 2026-07-24 — Continuous mouth openness

- Replaced the two-state mouth crossfade with the continuous morph validated in oc-live: the closed mouth stays fully opaque as the base and the open-mouth mesh collapses vertex-wise toward the upper-lip line (image y ≈ 502, the 49% origin from oc-live).
- The morph origin follows the posed pitch offset the same way the blink center does, so lip flaps stay aligned while nodding.
- `MotionDirector` gained a lip-flap source with the oc-live cadence (70–160 ms targets, 15% closures, otherwise 0.35–1) and a frame-rate independent smoothing equivalent to the old 0.35-per-frame lerp.
- The manual openness slider pauses the automatic lip flap, mirroring the HeadRoll manual/auto interaction; `autoTalk` stays off by default and the smoothed target remains the hook for future volume-driven speech.

## 2026-07-24 — mesh-live CR and reuse refactor

Reviewed the whole `src/mesh-live/` module and restructured it so the L2D
capability can be reused outside the mesh-turn demo page. Three commits, each
visually regressed against the endpoint poses:

- **geometry slimming**: dropped the never-wired composition pipeline
  (`composeHeadPose`, rotate/ellipsoid/corner-residual helpers, ~430 lines with
  tests). The renderer's real path is THREE group rotations + its own surface
  sampling; keeping a parallel unused implementation only risked drift.
  Recoverable from git history if a DOM-free composer is ever needed.
- **engine/model split**: `MeshCharacterRenderer` now takes an injected model
  contract — layers, pivots, limits, surface ellipses, per-surface depth
  weights, eye-motion tuning and the two art-directed key-shape builders.
  Everything Ichigo-specific lives in `ichigo-model.js` (exported as
  `ICHIGO_MODEL`); a new character is a new model file, not engine changes.
- **CharacterRig driver**: owns ParameterController + MotionDirector, composes
  manual normalized poses with automatic motion and runs the rAF loop.
  Embedding the character elsewhere is now
  `rig.start(params => renderer.update(params))` plus the `MeshCharacter`
  React wrapper with a `model` prop.

### Deviations

- The corner-residual math recorded as "implemented but zero" in the HeadPitch
  notes was deleted with the unwired pipeline; re-add it as authored model data
  if a diagonal artifact ever demands it.
- `clamp` remains duplicated in motion-controller (private) and
  parameter-controller (exported): accepted duplication to keep both modules
  dependency-free rather than introducing a shared util for one function.
