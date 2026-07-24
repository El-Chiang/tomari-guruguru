import assert from 'node:assert/strict';
import test from 'node:test';

import { CharacterRig } from './character-rig.js';

const QUIET = {
  eyeFollow: false,
  autoSaccade: false,
  autoBlink: false,
  autoRoll: false,
  autoHair: false,
  autoTalk: false,
};

test('manual pose targets converge through smoothing', () => {
  const rig = new CharacterRig({ random: () => 0.5 });
  rig.setMotionSettings(QUIET);
  rig.setPose({ yaw: 0.5, pitch: -1 });

  let parameters;
  for (let frame = 0; frame < 120; frame += 1) parameters = rig.update(1 / 60);
  assert.ok(Math.abs(parameters.headYaw - 0.5) < 0.01);
  assert.ok(Math.abs(parameters.headPitch - -1) < 0.01);
  assert.equal(parameters.headRoll, 0);
});

test('manual roll and mouth compose additively with automatic sources', () => {
  const rig = new CharacterRig({ random: () => 0.5 });
  rig.setMotionSettings({ ...QUIET, autoTalk: true });
  rig.setPose({ roll: 0.25, mouthOpen: 0.5 });

  let parameters;
  for (let frame = 0; frame < 60; frame += 1) parameters = rig.update(1 / 60);
  assert.ok(Math.abs(parameters.headRoll - 0.25) < 0.01);
  // random=0.5 keeps the lip flap open, so manual + automatic saturates at 1.
  assert.ok(parameters.mouthOpen > 0.9);
  assert.ok(parameters.mouthOpen <= 1);
});

test('invalid pose fields are ignored', () => {
  const rig = new CharacterRig({ random: () => 0.5 });
  rig.setPose({ yaw: 0.5 });
  rig.setPose({ yaw: Number.NaN, pitch: undefined });
  assert.equal(rig.pose.yaw, 0.5);
  assert.equal(rig.pose.pitch, 0);
});

test('normalizePointer maps element space to [-1, 1] and inverts Y', () => {
  const element = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  };
  const centre = CharacterRig.normalizePointer({ clientX: 50, clientY: 50 }, element);
  assert.deepEqual(centre, { x: 0, y: -0 });
  const bottomRight = CharacterRig.normalizePointer({ clientX: 100, clientY: 100 }, element);
  assert.equal(bottomRight.x, 1);
  assert.equal(bottomRight.y, -1);
  assert.equal(CharacterRig.normalizePointer({ clientX: 0, clientY: 0 }, null), null);
});
