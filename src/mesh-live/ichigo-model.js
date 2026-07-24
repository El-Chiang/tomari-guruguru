/**
 * Ichigo model data for the generic mesh character renderer.
 *
 * Everything Ichigo-specific lives here: layer definitions, pivots, pose
 * limits, the face/hair surface ellipses, per-surface depth weights and the
 * art-directed key-shape builders. The renderer only consumes the exported
 * ICHIGO_MODEL contract, so a new character means a new file of this shape —
 * not renderer changes.
 */

export const MODEL_SIZE = 1024;

export const YAW_LIMIT_DEG = 12;

export const PITCH_UP_LIMIT_DEG = 15;

export const PITCH_DOWN_LIMIT_DEG = 15;

export const ROLL_LIMIT_DEG = 8;

// The head turns around the ear/upper-neck axis rather than the canvas centre.
// Keep this in model data so the A/B prototype and future exported rigs share
// exactly the same neutral pose.
export const HEAD_PIVOT_IMAGE = Object.freeze({ x: 489, y: 410 });

// Roll has a different anatomical pivot from yaw/pitch. Keeping the tip of
// the chin fixed makes a small head tilt read as a neck bend instead of a flat
// card rotating around the centre of the face.
export const HEAD_ROLL_PIVOT_IMAGE = Object.freeze({ x: 489, y: 570 });

export const EYE_TURN_SETTINGS = Object.freeze({
  farScaleX: 0.72,
  farScaleY: 0.96,
  nearScaleX: 1.035,
  nearScaleY: 1.01,
});

export const DEFAULT_SURFACE_SETTINGS = Object.freeze({
  faceDepth: 58,
  hairDepth: 30,
  perspective: 0.18,
  corrective: 1,
  pitchCorrective: 1,
});

// Shallow ellipsoids sampled for per-vertex Z depth, in image coordinates.
const FACE_SURFACE = Object.freeze({ centerX: 489, centerY: 365, radiusX: 265, radiusY: 340 });
const HAIR_SURFACE = Object.freeze({ centerX: 489, centerY: 340, radiusX: 330, radiusY: 390 });

// How much of the face/hair surface caps each surface type inherits as depth.
// Missing surfaces fall back to the bare face shell for head-group layers and
// to zero depth for body-group layers.
const SURFACE_DEPTH_WEIGHTS = Object.freeze({
  face: { face: 1 },
  backHair: { hair: 0.72 },
  frontHair: { face: 0.5, hair: 1 },
  earArc: { face: 0.55 },
  accessory: { face: 0.45, hair: 1 },
  feature: { face: 1 },
  eye: { face: 1 },
  flat: {},
});

const EYE_MOTION_SETTINGS = Object.freeze({
  irisTravelX: 6.5,
  irisTravelY: 3,
  minOpenScale: 0.04,
  // A closing lid occludes the iris before the eyelash reaches its flattest
  // key shape; fading between these openness bounds avoids a coloured iris
  // line surviving in the fully closed pose.
  irisFade: [0.08, 0.52],
});

// Coordinates are expressed in the original 1024 x 1024 image space.
// Crops deliberately ignore isolated low-alpha pixels far away from the art.
// The audit report in live2d-work/ichigo/alpha-bounds.json is the evidence
// source; these padded boxes remain art-directed model inputs.
export const ICHIGO_LAYERS = [
  {
    id: 'back_hair', texture: 'oc-layers/back_hair.webp', crop: [176, 0, 690, 662],
    order: 10, group: 'head', surface: 'backHair', grid: [8, 8], z: -42,
    correction: { shift: 3, pitchShift: 2.2, pitchBend: 2.4 },
    hairMotion: { parameter: 'hairBack', sway: 36, lift: 5, root: 0.08 },
  },
  {
    id: 'topwear', texture: 'oc-layers/topwear.webp', crop: [166, 526, 660, 250],
    order: 20, group: 'body', surface: 'flat', grid: [2, 2], z: -20,
  },
  {
    id: 'neck', texture: 'oc-layers/neck.webp', crop: [386, 500, 218, 232],
    order: 30, group: 'body', surface: 'flat', grid: [2, 3], z: -12,
    correction: { pitchShift: 2.5, pitchScaleX: 0.018 },
  },
  {
    id: 'ears', texture: 'oc-layers/ears.webp', crop: [238, 326, 510, 170],
    order: 35, group: 'head', surface: 'earArc', grid: [6, 3], z: -8,
    correction: { shift: 4, pitchShift: 0.8, pitchScaleY: 0.985 },
  },
  {
    id: 'face', texture: 'oc-layers/face.webp', crop: [278, 108, 438, 486],
    order: 40, group: 'head', surface: 'face', grid: [8, 10], z: 0,
    correction: {
      centerShift: 12,
      jawShift: 8,
      farCheek: 12,
      jawLift: 3.5,
      jawCornerLift: 3,
      cheekDepth: 9,
      pitchShift: 4.8,
      pitchJawScaleX: 0.035,
      pitchJawDepth: 4,
    },
  },
  {
    id: 'nose', texture: 'oc-layers/nose.webp', crop: [452, 416, 96, 98],
    order: 50, group: 'features', surface: 'feature', grid: [2, 2], z: 50,
    featureShift: 14, correction: { pitchShift: 4.4, pitchScaleY: 0.97 },
  },
  {
    id: 'mouth', texture: 'oc-layers/mouth.webp', crop: [448, 476, 94, 76],
    order: 52, group: 'features', surface: 'feature', grid: [3, 2], z: 42,
    featureShift: 10, correction: { pitchShift: 3.6, pitchScaleY: 0.965 },
  },
  {
    id: 'mouth_mid', texture: 'oc-layers/mouth_mid.webp', crop: [448, 476, 94, 76],
    order: 53, group: 'features', surface: 'feature', grid: [3, 2], z: 43,
    featureShift: 10, correction: { pitchShift: 3.6, pitchScaleY: 0.965 },
    // Open-mouth art scales down onto the upper lip line (image y ≈ 502,
    // the 49% origin validated in oc-live) so mouthOpen morphs continuously.
    mouthMorph: { parameter: 'mouthOpen', originImageY: 502 },
  },
  {
    id: 'eyebrow_L', texture: 'oc-mesh-layers/eyebrow_L.webp', crop: [490, 270, 205, 82],
    fallbackTexture: 'oc-layers/eyebrow.webp', order: 54, group: 'leftEye',
    surface: 'feature', grid: [3, 2], z: 46, featureShift: 11,
    correction: { pitchShift: 2.2, pitchScaleY: 0.985 },
  },
  {
    id: 'eyebrow_R', texture: 'oc-mesh-layers/eyebrow_R.webp', crop: [300, 270, 205, 82],
    fallbackTexture: 'oc-layers/eyebrow.webp', order: 55, group: 'rightEye',
    surface: 'feature', grid: [3, 2], z: 46, featureShift: 11,
    correction: { pitchShift: 2.2, pitchScaleY: 0.985 },
  },
  {
    id: 'irides_L', texture: 'oc-mesh-layers/irides_L.webp', crop: [485, 330, 180, 135],
    fallbackTexture: 'oc-layers/irides.webp', order: 56, group: 'leftEye',
    surface: 'eye', grid: [4, 3], z: 49, featureShift: 13, eye: 'left', iris: true,
    correction: { pitchShift: 2.8, pitchScaleY: 0.98 },
  },
  {
    id: 'irides_R', texture: 'oc-mesh-layers/irides_R.webp', crop: [297, 330, 180, 135],
    fallbackTexture: 'oc-layers/irides.webp', order: 57, group: 'rightEye',
    surface: 'eye', grid: [4, 3], z: 49, featureShift: 13, eye: 'right', iris: true,
    correction: { pitchShift: 2.8, pitchScaleY: 0.98 },
  },
  {
    id: 'eyelash_L', texture: 'oc-mesh-layers/eyelash_L.webp', crop: [480, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 58, group: 'leftEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'left', eyelash: true,
    correction: { pitchShift: 3, pitchScaleY: 0.975 },
  },
  {
    id: 'eyelash_R', texture: 'oc-mesh-layers/eyelash_R.webp', crop: [286, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 59, group: 'rightEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'right', eyelash: true,
    correction: { pitchShift: 3, pitchScaleY: 0.975 },
  },
  {
    id: 'front_hair', texture: 'oc-layers/front_hair.webp', crop: [206, 16, 540, 650],
    order: 70, group: 'head', surface: 'frontHair', grid: [8, 9], z: 58,
    correction: { shift: 7, pitchShift: 3.2, pitchBend: 4.5 },
    hairMotion: { parameter: 'hairFront', sway: 30, lift: 4, root: 0.06 },
  },
  {
    id: 'headwear', texture: 'oc-layers/headwear.webp', crop: [580, 210, 145, 145],
    order: 80, group: 'head', surface: 'accessory', grid: [3, 3], z: 84,
    correction: { shift: 4, pitchShift: 1.6, pitchScaleY: 0.985 },
    hairMotion: { parameter: 'hairAccessory', sway: 10, lift: 2, root: 0.72 },
  },
];

const HALF_MODEL = MODEL_SIZE / 2;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value, min, max) {
  const x = clamp01((value - min) / (max - min));
  return x * x * (3 - 2 * x);
}

/**
 * Art-directed HeadYaw endpoint offsets for one layer, `direction` = ±1.
 * These are the "美术修正" key shapes layered on top of the mathematical
 * surface rotation in mode B.
 */
function buildYawKeyShape(layer, data, direction) {
  const offsets = new Float32Array(data.positions.length);
  const correction = layer.correction ?? {};
  const centerX = layer.crop[0] + layer.crop[2] / 2;
  const centerY = layer.crop[1] + layer.crop[3] / 2;

  for (let vertex = 0; vertex < data.positions.length / 3; vertex += 1) {
    const imageX = data.imagePoints[vertex * 2];
    const imageY = data.imagePoints[vertex * 2 + 1];
    const nx = (imageX - FACE_SURFACE.centerX) / FACE_SURFACE.radiusX;
    const ny = (imageY - FACE_SURFACE.centerY) / FACE_SURFACE.radiusY;
    const offset = vertex * 3;

    if (layer.surface === 'face') {
      const centerInfluence = Math.max(0, 1 - Math.abs(nx));
      const jawInfluence = smoothstep(ny, 0.18, 0.92);
      const cheekInfluence = Math.max(0, 1 - Math.abs(ny + 0.08));
      offsets[offset] += direction * (
        (correction.centerShift ?? 10) * centerInfluence
        + (correction.jawShift ?? 7) * jawInfluence
      );
      offsets[offset] -= direction * Math.max(0, direction * nx)
        * (correction.farCheek ?? 10) * cheekInfluence;
      offsets[offset + 1] += jawInfluence
        * ((correction.jawLift ?? 3) + (correction.jawCornerLift ?? 3) * Math.abs(nx));
      offsets[offset + 2] += (correction.cheekDepth ?? 8) * cheekInfluence * centerInfluence;
    } else if (layer.eye) {
      const far = direction > 0 ? layer.eye === 'left' : layer.eye === 'right';
      const scaleX = far
        ? (correction.farScaleX ?? EYE_TURN_SETTINGS.farScaleX)
        : (correction.nearScaleX ?? EYE_TURN_SETTINGS.nearScaleX);
      const scaleY = far
        ? (correction.farScaleY ?? EYE_TURN_SETTINGS.farScaleY)
        : (correction.nearScaleY ?? EYE_TURN_SETTINGS.nearScaleY);
      const baseX = data.positions[offset];
      const baseY = data.positions[offset + 1];
      offsets[offset] += (baseX - (centerX - HALF_MODEL)) * (scaleX - 1);
      offsets[offset + 1] += (baseY - (HALF_MODEL - centerY)) * (scaleY - 1);
    }

    const featureShift = layer.featureShift ?? correction.shift ?? 0;
    if (layer.group === 'features' || layer.eye || layer.group?.endsWith('Eye')) {
      offsets[offset] += direction * featureShift;
    }
    if (layer.surface === 'frontHair' || layer.surface === 'backHair' || layer.surface === 'earArc') {
      offsets[offset] += direction * (correction.shift ?? 0) * Math.max(0.25, 1 - Math.abs(nx));
    }
    if (layer.surface === 'accessory') offsets[offset] += direction * (correction.shift ?? 3);
  }
  return offsets;
}

/**
 * Art-directed HeadPitch endpoint offsets for one layer, `direction` = ±1
 * (positive is looking down).
 */
function buildPitchKeyShape(layer, data, direction) {
  const offsets = new Float32Array(data.positions.length);
  const correction = layer.correction ?? {};
  const centerX = layer.crop[0] + layer.crop[2] / 2;
  const centerY = layer.crop[1] + layer.crop[3] / 2;
  const centerWorldX = centerX - HALF_MODEL;
  const centerWorldY = HALF_MODEL - centerY;

  for (let vertex = 0; vertex < data.positions.length / 3; vertex += 1) {
    const imageX = data.imagePoints[vertex * 2];
    const imageY = data.imagePoints[vertex * 2 + 1];
    const offset = vertex * 3;
    const baseX = data.positions[offset];
    const baseY = data.positions[offset + 1];
    const nx = (imageX - FACE_SURFACE.centerX) / FACE_SURFACE.radiusX;
    const ny = (imageY - FACE_SURFACE.centerY) / FACE_SURFACE.radiusY;

    if (layer.surface === 'face') {
      const jawInfluence = smoothstep(ny, 0.08, 0.78);
      const cheekInfluence = Math.max(0, 1 - Math.abs(ny + 0.08));
      offsets[offset] -= direction * (baseX - (FACE_SURFACE.centerX - HALF_MODEL))
        * (correction.pitchJawScaleX ?? 0.03) * jawInfluence;
      offsets[offset + 1] += direction * (correction.pitchShift ?? 4)
        * (0.2 + jawInfluence * 0.8);
      offsets[offset + 2] -= direction * (correction.pitchJawDepth ?? 3)
        * jawInfluence * Math.max(0.2, 1 - Math.abs(nx)) * cheekInfluence;
      continue;
    }

    if (layer.id === 'neck') {
      const row = clamp01((imageY - layer.crop[1]) / layer.crop[3]);
      const topInfluence = 1 - smoothstep(row, 0.05, 0.85);
      offsets[offset] += direction * (baseX - centerWorldX)
        * (correction.pitchScaleX ?? 0) * topInfluence;
      offsets[offset + 1] += direction * (correction.pitchShift ?? 0) * topInfluence;
      continue;
    }

    const scaleY = correction.pitchScaleY ?? 1;
    offsets[offset + 1] += (baseY - centerWorldY) * (scaleY - 1);

    if (layer.surface === 'frontHair' || layer.surface === 'backHair') {
      const row = clamp01((imageY - layer.crop[1]) / layer.crop[3]);
      const tipInfluence = smoothstep(row, 0.28, 0.95);
      // Hair tips lag behind the face and therefore cover more of the eyes
      // while looking down, instead of moving as a rigid face sticker.
      offsets[offset + 1] -= direction * (
        (correction.pitchShift ?? 0) * (0.25 + tipInfluence * 0.75)
        + (correction.pitchBend ?? 0) * tipInfluence
      );
    } else {
      offsets[offset + 1] += direction * (correction.pitchShift ?? 0);
    }
  }

  return offsets;
}

/** The complete renderer contract for the Ichigo character. */
export const ICHIGO_MODEL = Object.freeze({
  size: MODEL_SIZE,
  layers: ICHIGO_LAYERS,
  pivots: { head: HEAD_PIVOT_IMAGE, roll: HEAD_ROLL_PIVOT_IMAGE },
  limits: {
    yawDeg: YAW_LIMIT_DEG,
    pitchUpDeg: PITCH_UP_LIMIT_DEG,
    pitchDownDeg: PITCH_DOWN_LIMIT_DEG,
    rollDeg: ROLL_LIMIT_DEG,
  },
  surfaces: { face: FACE_SURFACE, hair: HAIR_SURFACE },
  depthWeights: SURFACE_DEPTH_WEIGHTS,
  eyeMotion: EYE_MOTION_SETTINGS,
  defaultSurfaceSettings: DEFAULT_SURFACE_SETTINGS,
  buildYawKeyShape,
  buildPitchKeyShape,
});
