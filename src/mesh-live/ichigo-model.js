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
    correction: { pitchShift: 2.8, pitchScaleY: 0.965 },
  },
  {
    id: 'irides_R', texture: 'oc-mesh-layers/irides_R.webp', crop: [330, 330, 180, 135],
    fallbackTexture: 'oc-layers/irides.webp', order: 57, group: 'rightEye',
    surface: 'eye', grid: [4, 3], z: 49, featureShift: 13, eye: 'right', iris: true,
    correction: { pitchShift: 2.8, pitchScaleY: 0.965 },
  },
  {
    id: 'eyelash_L', texture: 'oc-mesh-layers/eyelash_L.webp', crop: [480, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 58, group: 'leftEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'left', eyelash: true,
    correction: { pitchShift: 2.8, pitchScaleY: 0.965 },
  },
  {
    id: 'eyelash_R', texture: 'oc-mesh-layers/eyelash_R.webp', crop: [286, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 59, group: 'rightEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'right', eyelash: true,
    correction: { pitchShift: 2.8, pitchScaleY: 0.965 },
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
