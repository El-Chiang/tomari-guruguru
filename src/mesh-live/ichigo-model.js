export const MODEL_SIZE = 1024;

export const YAW_LIMIT_DEG = 12;

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
});

// Coordinates are expressed in the original 1024 x 1024 image space.
// Crops deliberately ignore isolated low-alpha pixels far away from the art.
// The audit report in live2d-work/ichigo/alpha-bounds.json is the evidence
// source; these padded boxes remain art-directed model inputs.
export const ICHIGO_LAYERS = [
  {
    id: 'back_hair', texture: 'oc-layers/back_hair.webp', crop: [176, 0, 690, 662],
    order: 10, group: 'head', surface: 'backHair', grid: [8, 8], z: -42,
    correction: { shift: 3 },
  },
  {
    id: 'topwear', texture: 'oc-layers/topwear.webp', crop: [166, 526, 660, 250],
    order: 20, group: 'body', surface: 'flat', grid: [2, 2], z: -20,
  },
  {
    id: 'neck', texture: 'oc-layers/neck.webp', crop: [386, 500, 218, 232],
    order: 30, group: 'body', surface: 'flat', grid: [2, 3], z: -12,
  },
  {
    id: 'ears', texture: 'oc-layers/ears.webp', crop: [238, 326, 510, 170],
    order: 35, group: 'head', surface: 'earArc', grid: [6, 3], z: -8,
    correction: { shift: 4 },
  },
  {
    id: 'face', texture: 'oc-layers/face.webp', crop: [278, 108, 438, 486],
    order: 40, group: 'head', surface: 'face', grid: [8, 10], z: 0,
    correction: { centerShift: 12, jawShift: 8, farCheek: 12, jawLift: 3.5, jawCornerLift: 3, cheekDepth: 9 },
  },
  {
    id: 'nose', texture: 'oc-layers/nose.webp', crop: [452, 416, 96, 98],
    order: 50, group: 'features', surface: 'feature', grid: [2, 2], z: 50,
    featureShift: 14,
  },
  {
    id: 'mouth', texture: 'oc-layers/mouth.webp', crop: [448, 476, 94, 76],
    order: 52, group: 'features', surface: 'feature', grid: [3, 2], z: 42,
    featureShift: 10,
  },
  {
    id: 'mouth_mid', texture: 'oc-layers/mouth_mid.webp', crop: [448, 476, 94, 76],
    order: 53, group: 'features', surface: 'feature', grid: [3, 2], z: 43,
    featureShift: 10, opacityParameter: 'mouthOpen',
  },
  {
    id: 'eyebrow_L', texture: 'oc-mesh-layers/eyebrow_L.webp', crop: [490, 270, 205, 82],
    fallbackTexture: 'oc-layers/eyebrow.webp', order: 54, group: 'leftEye',
    surface: 'feature', grid: [3, 2], z: 46, featureShift: 11,
  },
  {
    id: 'eyebrow_R', texture: 'oc-mesh-layers/eyebrow_R.webp', crop: [300, 270, 205, 82],
    fallbackTexture: 'oc-layers/eyebrow.webp', order: 55, group: 'rightEye',
    surface: 'feature', grid: [3, 2], z: 46, featureShift: 11,
  },
  {
    id: 'irides_L', texture: 'oc-mesh-layers/irides_L.webp', crop: [485, 330, 180, 135],
    fallbackTexture: 'oc-layers/irides.webp', order: 56, group: 'leftEye',
    surface: 'eye', grid: [4, 3], z: 49, featureShift: 13, eye: 'left', iris: true,
  },
  {
    id: 'irides_R', texture: 'oc-mesh-layers/irides_R.webp', crop: [330, 330, 180, 135],
    fallbackTexture: 'oc-layers/irides.webp', order: 57, group: 'rightEye',
    surface: 'eye', grid: [4, 3], z: 49, featureShift: 13, eye: 'right', iris: true,
  },
  {
    id: 'eyelash_L', texture: 'oc-mesh-layers/eyelash_L.webp', crop: [480, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 58, group: 'leftEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'left', eyelash: true,
  },
  {
    id: 'eyelash_R', texture: 'oc-mesh-layers/eyelash_R.webp', crop: [286, 312, 230, 180],
    fallbackTexture: 'oc-layers/eyelash.webp', order: 59, group: 'rightEye',
    surface: 'eye', grid: [4, 4], z: 52, featureShift: 13, eye: 'right', eyelash: true,
  },
  {
    id: 'front_hair', texture: 'oc-layers/front_hair.webp', crop: [206, 16, 540, 650],
    order: 70, group: 'head', surface: 'frontHair', grid: [8, 9], z: 58,
    correction: { shift: 7 },
  },
  {
    id: 'headwear', texture: 'oc-layers/headwear.webp', crop: [580, 210, 145, 145],
    order: 80, group: 'head', surface: 'accessory', grid: [3, 3], z: 84,
    correction: { shift: 4 },
  },
];
