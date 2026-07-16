import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blendPoseKeyShapes,
  composeHeadPose,
  composePositions,
  createEllipsoidZProfile,
  createGridGeometry,
  createGridIndices,
  createGridUVs,
  createShellZProfile,
  interpolateKeyShapes,
  mapAsymmetricAngle,
  normalizeCrop,
  rotatePositionsPitch,
  rotatePositionsYaw,
} from './geometry.js';

const round = (array, digits = 5) => Array.from(array, (value) => Number(value.toFixed(digits)));

test('normalizeCrop accepts pixel arrays and objects', () => {
  assert.deepEqual(normalizeCrop([10, 20, 30, 40]), { x: 10, y: 20, width: 30, height: 40 });
  assert.deepEqual(normalizeCrop({ x: 1, y: 2, width: 3, height: 4 }), {
    x: 1, y: 2, width: 3, height: 4,
  });
});

test('createGridGeometry creates centered positions, crop UVs and triangles', () => {
  const geometry = createGridGeometry({
    columns: 1,
    rows: 1,
    crop: [25, 10, 50, 80],
    textureWidth: 100,
    textureHeight: 100,
  });
  assert.equal(geometry.vertexCount, 4);
  assert.deepEqual(round(geometry.positions), [
    -25, 40, 0, 25, 40, 0,
    -25, -40, 0, 25, -40, 0,
  ]);
  assert.deepEqual(round(geometry.uvs), [0.25, 0.9, 0.75, 0.9, 0.25, 0.1, 0.75, 0.1]);
  assert.deepEqual(Array.from(geometry.indices), [0, 2, 1, 1, 2, 3]);
  assert.deepEqual(round(geometry.imagePoints), [25, 10, 75, 10, 25, 90, 75, 90]);
});

test('standalone grid UV and index helpers support cols alias and V direction', () => {
  assert.deepEqual(round(createGridUVs({
    cols: 1, rows: 1, crop: [0, 0, 50, 50], width: 100, height: 100, flipV: false,
  })), [0, 0, 0.5, 0, 0, 0.5, 0.5, 0.5]);
  assert.deepEqual(Array.from(createGridIndices({ cols: 2, rows: 1 })), [
    0, 3, 1, 1, 3, 4,
    1, 4, 2, 2, 4, 5,
  ]);
});

test('ellipsoid profile peaks at the centre and falls to zero at the rim', () => {
  const positions = new Float32Array([
    0, 0, 0,
    5, 0, 0,
    0, 10, 0,
    20, 0, 0,
  ]);
  assert.deepEqual(round(createEllipsoidZProfile(positions, {
    radiusX: 10, radiusY: 10, depth: 20,
  })), [20, 17.32051, 0, 0]);
});

test('shell profile supports rear-facing depth and a base Z offset', () => {
  const profile = createShellZProfile(new Float32Array([0, 0, 0, 10, 0, 0]), {
    radiusX: 10, radiusY: 10, depth: 12, baseZ: -3, side: -1,
  });
  assert.deepEqual(round(profile), [-15, -3]);
});

test('key shapes interpolate independently on the negative and positive segments', () => {
  const base = new Float32Array([10, 20, 30]);
  const shapes = {
    negative: new Float32Array([-4, -2, 0]),
    neutral: new Float32Array([0, 0, 0]),
    positive: new Float32Array([8, 4, 2]),
  };
  assert.deepEqual(round(interpolateKeyShapes(base, shapes, -0.5)), [8, 19, 30]);
  assert.deepEqual(round(interpolateKeyShapes(base, shapes, 0.25)), [12, 21, 30.5]);
  assert.deepEqual(round(interpolateKeyShapes(base, shapes, 4)), [18, 24, 32]);
});

test('key shapes can describe absolute positions', () => {
  const result = interpolateKeyShapes(new Float32Array([2, 2, 2]), {
    '-1': new Float32Array([-2, 0, 2]),
    0: new Float32Array([0, 2, 4]),
    1: new Float32Array([2, 4, 6]),
  }, -0.5, { mode: 'positions' });
  assert.deepEqual(round(result), [-1, 1, 3]);
});

test('yaw rotation uses a right-handed Y-axis rotation around an origin', () => {
  const result = rotatePositionsYaw(new Float32Array([2, 3, 0]), Math.PI / 2, {
    originX: 1,
    originY: 2,
  });
  assert.deepEqual(round(result), [1, 3, -1]);
});

test('asymmetric angle mapping gives negative and positive poses independent limits', () => {
  const angles = { negativeRadians: -0.2, positiveRadians: 0.4 };
  assert.equal(mapAsymmetricAngle(-0.5, angles), -0.1);
  assert.equal(mapAsymmetricAngle(0.5, angles), 0.2);
  assert.equal(mapAsymmetricAngle(5, angles), 0.4);
  assert.equal(mapAsymmetricAngle(-2, { negativeRadians: 0.2, positiveRadians: 0.4 }), -0.2);
});

test('pitch rotation uses a right-handed X-axis rotation around an origin', () => {
  const result = rotatePositionsPitch(new Float32Array([3, 3, 0]), Math.PI / 2, {
    originX: 2,
    originY: 1,
  });
  assert.deepEqual(round(result), [3, 1, 2]);
});

test('pose key shapes add axis corrections and a weighted active-corner residual', () => {
  const base = new Float32Array([10, 20, 30]);
  const result = blendPoseKeyShapes(base, {
    yaw: 0.5,
    pitch: 0.25,
    yawKeyShapes: { positive: new Float32Array([2, 0, 0]) },
    pitchKeyShapes: { positive: new Float32Array([0, 4, 0]) },
    cornerResiduals: { '1,1': new Float32Array([0, 0, 8]) },
  });
  assert.deepEqual(round(result), [11, 21, 31]);
});

test('pose key shapes select only the residual from the active quadrant', () => {
  const result = blendPoseKeyShapes(new Float32Array([0, 0, 0]), {
    yaw: -1,
    pitch: 0.5,
    cornerResiduals: {
      yawNegativePitchPositive: new Float32Array([2, 4, 6]),
      yawPositivePitchPositive: new Float32Array([20, 40, 60]),
    },
  });
  assert.deepEqual(round(result), [1, 2, 3]);
});

test('composePositions adds surface and corrective offsets before yaw', () => {
  const result = composePositions(new Float32Array([1, 2, 3, -1, 0, 1]), {
    zProfile: new Float32Array([4, 2]),
    deformation: new Float32Array([1, -1, 2, 0, 3, -1]),
    yawRadians: Math.PI / 2,
  });
  assert.deepEqual(round(result), [9, 1, -2, 2, 3, 1]);
});

test('composeHeadPose applies keyforms, then yaw, then pitch', () => {
  const result = composeHeadPose(new Float32Array([1, 1, 0]), {
    yaw: 1,
    pitch: 1,
    yawAngles: { negativeRadians: Math.PI / 2, positiveRadians: Math.PI / 2 },
    pitchAngles: { negativeRadians: Math.PI / 2, positiveRadians: Math.PI / 2 },
  });
  assert.deepEqual(round(result), [0, 1, 1]);
});

test('composeHeadPose supports asymmetric pitch limits and corner correction', () => {
  const result = composeHeadPose(new Float32Array([0, 0, 0]), {
    yaw: -0.5,
    pitch: -1,
    pitchAngles: { negativeRadians: 0, positiveRadians: 1 },
    yawKeyShapes: { negative: new Float32Array([-4, 0, 0]) },
    pitchKeyShapes: { negative: new Float32Array([0, -3, 0]) },
    cornerResiduals: { '-1,-1': new Float32Array([0, 0, 2]) },
  });
  assert.deepEqual(round(result), [-2, -3, 1]);
});

test('geometry helpers reject mismatched vertex data', () => {
  assert.throws(() => composePositions(new Float32Array([0, 0, 0]), {
    zProfile: new Float32Array([0, 1]),
  }), /one value per vertex/);
  assert.throws(() => interpolateKeyShapes(new Float32Array([0, 0, 0]), {
    positive: new Float32Array([0, 0, 0, 0, 0, 0]),
  }, 1), /length must match/);
  assert.throws(() => blendPoseKeyShapes(new Float32Array([0, 0, 0]), {
    yaw: 1,
    pitch: 1,
    cornerResiduals: { '1,1': new Float32Array([0, 0, 0, 0, 0, 0]) },
  }), /corner residual length must match/);
});
