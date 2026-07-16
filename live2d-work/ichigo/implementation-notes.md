# Implementation notes

## Deviations

- The first layered PSD was written with ImageMagick. Cubism 5.3 could not import
  it even though ImageMagick could read it back. The import pipeline was changed
  to `psd-tools`, which creates standard RGB/8-bit pixel layers and a composite
  preview. Original project assets remain unchanged.
- Auto facial motion requires distinct left/right eye and eyebrow deformers. The
  See-through output combined each pair, so a v2 PSD masks those three semantic
  layers into character-left and character-right full-canvas layers. No pixels
  are rescaled or repositioned, and the original combined layers remain intact.
- Cubism's automatic deformer generator produced ungenerated facial placeholders,
  misclassified the English-named ArtMeshes, and left a duplicated upper-body
  Z/Y/breath hierarchy after manual facial setup began. The hybrid model therefore
  switches to a fresh v2 PSD import with a minimal manually-created hierarchy
  instead of repairing or depending on the generated full-body template.
- Cubism's automatic facial action moved isolated features across a stationary
  face and hair, while a rigid neck-position translation moved the whole head
  without creating yaw. Those generated actions were discarded. Angle X is now
  authored as a layered manual rig: a low-perspective whole-head warp provides
  the base silhouette, and child deformers provide controlled facial and hair
  parallax.
- The imported full-canvas layers contain sparse low-alpha pixels outside the
  visible artwork, so automatically expanding the head warp to include every
  child produced a nearly full-canvas 29 x 31 cage. The cage was restored to a
  manually bounded 6 x 6 head region. This is sufficient for the current visible
  rig, but the source alpha should be cleaned before final runtime export and
  performance validation.
- The web A/B prototype uses an orthographic camera instead of a perspective
  camera. This preserves exact neutral-pose pixel registration across layers;
  the shared per-vertex Z surface still creates parallax after yaw rotation.
- The prototype stores deterministic `-1 / 0 / +1` endpoint corrections in the
  model configuration and generates vertex key shapes from them. A full visual
  control-point editor is intentionally deferred until the A/B direction is
  accepted, because building it before proving the look would dominate the
  renderer work.
- Left/right ears remain a combined source layer and runtime textures remain
  full-canvas during the low-cost A/B gate. Ear-specific occlusion/masks and
  physically cropped padded textures are required before mobile production
  validation, but they do not block choosing the deformation direction.
- Far-eye perspective correction is intentionally anisotropic: the endpoint
  compresses eye width to 72% while retaining 96% of its height. Uniform eye
  scaling looked like simple zoom rather than foreshortening and was rejected
  during visual review.
