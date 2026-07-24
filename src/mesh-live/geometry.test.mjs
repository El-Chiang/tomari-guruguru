import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGridGeometry,
  createGridIndices,
  createGridUVs,
  interpolateKeyShapes,
  normalizeCrop,
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

test('key shapes reject mismatched vertex data', () => {
  assert.throws(() => interpolateKeyShapes(new Float32Array([0, 0, 0]), {
    positive: new Float32Array([0, 0, 0, 0, 0, 0]),
  }, 1), /length must match/);
});
