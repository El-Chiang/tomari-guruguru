import assert from 'node:assert/strict';
import test from 'node:test';

import { ParameterController } from './parameter-controller.js';

test('head poses start neutral and clamp to the normalized pose range', () => {
  const controller = new ParameterController();

  assert.equal(controller.current.headPitch, 0);
  assert.equal(controller.current.headRoll, 0);
  controller.setImmediate({ headPitch: -4 });
  assert.equal(controller.current.headPitch, -1);
  assert.equal(controller.target.headPitch, -1);

  controller.setTarget('headPitch', 3);
  assert.equal(controller.target.headPitch, 1);

  controller.setImmediate({ headRoll: 4 });
  assert.equal(controller.current.headRoll, 1);
});

test('invalid pose values do not overwrite the current target', () => {
  const controller = new ParameterController({ headPitch: 0.25 });

  controller.setTarget('headPitch', Number.NaN);
  assert.equal(controller.target.headPitch, 0.25);
  controller.setTarget('unknownPose', 1);
  assert.equal('unknownPose' in controller.target, false);
});

test('pose smoothing is frame-rate independent and converges toward the target', () => {
  const oneFrame = new ParameterController();
  const twoHalfFrames = new ParameterController();
  oneFrame.setTarget('headPitch', 1);
  twoHalfFrames.setTarget('headPitch', 1);

  oneFrame.update(1 / 60);
  twoHalfFrames.update(1 / 120);
  twoHalfFrames.update(1 / 120);

  assert.ok(Math.abs(oneFrame.current.headPitch - twoHalfFrames.current.headPitch) < 1e-12);
  assert.ok(oneFrame.current.headPitch > 0 && oneFrame.current.headPitch < 1);
});
