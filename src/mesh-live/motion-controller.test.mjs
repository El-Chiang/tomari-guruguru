import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blinkOpenness,
  mixMotionParameters,
  MotionDirector,
} from './motion-controller.js';

test('motion sources add signed poses, multiply openness, and clamp output', () => {
  const result = mixMotionParameters(
    { eyeX: 0.6, eyeOpenL: 1 },
    [
      { values: { eyeX: 0.7 } },
      { mode: 'multiply', values: { eyeOpenL: 0.4 } },
    ],
  );
  assert.equal(result.eyeX, 1);
  assert.equal(result.eyeOpenL, 0.4);
});

test('blink envelope closes fully and returns to open', () => {
  assert.equal(blinkOpenness(0), 1);
  assert.equal(blinkOpenness(0.45), 0);
  assert.equal(blinkOpenness(1), 1);
});

test('pointer gaze follows quickly then relaxes after its idle window', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  director.setPointer(1, -0.5);
  const following = director.update(0.1, { autoSaccade: false, idleDelay: 0.2 });
  assert.ok(following.eyeX > 0.7);
  assert.ok(following.eyeY < -0.35);

  let relaxed = following;
  for (let index = 0; index < 12; index += 1) {
    relaxed = director.update(0.1, { autoSaccade: false, idleDelay: 0.2 });
  }
  assert.ok(Math.abs(relaxed.eyeX) < 0.001);
  assert.ok(Math.abs(relaxed.eyeY) < 0.001);
});

test('manual blink remains continuous and completes without timers', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  director.triggerBlink({ duration: 0.4 });
  director.update(0.08, { autoBlink: false });
  const closing = director.update(0.08, { autoBlink: false });
  assert.ok(closing.eyeOpenL < 0.05);
  assert.equal(closing.eyeOpenL, closing.eyeOpenR);

  director.update(0.1, { autoBlink: false });
  director.update(0.1, { autoBlink: false });
  const open = director.update(0.1, { autoBlink: false });
  assert.equal(open.eyeOpenL, 1);
  assert.equal(open.eyeOpenR, 1);
});

test('idle saccade is generated after the quiet interval', () => {
  const values = [0, 1, 0.75, 0.25, 0.5, 0.5];
  let index = 0;
  const director = new MotionDirector({ random: () => values[index++ % values.length] });
  let output;
  for (let frame = 0; frame < 11; frame += 1) {
    output = director.update(0.1, { eyeFollow: false, autoSaccade: true, autoBlink: false });
  }
  assert.ok(Math.abs(output.eyeX) > 0.01 || Math.abs(output.eyeY) > 0.01);
});

test('automatic head roll reaches its authored amplitude and can be disabled', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  let output;
  for (let frame = 0; frame < 10; frame += 1) {
    output = director.update(0.1, {
      autoBlink: false,
      autoSaccade: false,
      autoRoll: true,
      rollAmplitude: 0.5,
      rollDuration: 4,
    });
  }
  assert.ok(Math.abs(output.headRoll - 0.5) < 1e-12);

  output = director.update(0.1, { autoBlink: false, autoSaccade: false, autoRoll: false });
  assert.equal(output.headRoll, 0);
});

test('random lip flap opens the mouth continuously and settles closed when disabled', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  const settings = { autoBlink: false, autoSaccade: false, autoRoll: false, autoHair: false };

  let output = director.update(0.1, { ...settings, autoTalk: false });
  assert.equal(output.mouthOpen, 0);

  const samples = [];
  for (let frame = 0; frame < 12; frame += 1) {
    output = director.update(1 / 60, { ...settings, autoTalk: true });
    samples.push(output.mouthOpen);
  }
  assert.ok(output.mouthOpen > 0.3);
  assert.ok(output.mouthOpen <= 1);
  // Smoothing must produce intermediate values, not a binary texture swap.
  assert.ok(samples.some((value) => value > 0.05 && value < 0.3));

  for (let frame = 0; frame < 40; frame += 1) {
    output = director.update(1 / 60, { ...settings, autoTalk: false });
  }
  assert.equal(output.mouthOpen, 0);
});

test('lip flap closures follow the random roll', () => {
  const rolls = [0.1];
  const director = new MotionDirector({ random: () => rolls[0] });
  const settings = {
    autoBlink: false, autoSaccade: false, autoRoll: false, autoHair: false, autoTalk: true,
  };

  let output;
  for (let frame = 0; frame < 30; frame += 1) output = director.update(1 / 60, settings);
  // A roll below 0.15 keeps scheduling closed-mouth targets, so the smoothed
  // openness never climbs.
  assert.ok(output.mouthOpen < 0.05);

  rolls[0] = 0.9;
  for (let frame = 0; frame < 30; frame += 1) output = director.update(1 / 60, settings);
  assert.ok(output.mouthOpen > 0.5);
});

test('hair layers keep independent phase, amplitude, and roll lag', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  let output;
  for (let frame = 0; frame < 9; frame += 1) {
    output = director.update(0.1, {
      autoBlink: false,
      autoSaccade: false,
      autoRoll: true,
      rollAmplitude: 0.5,
      rollDuration: 4,
      autoHair: true,
      hairAmplitude: 1 / 3,
      hairDuration: 3.6,
    });
  }

  assert.notEqual(output.hairFront, output.hairBack);
  assert.notEqual(output.hairFront, output.hairAccessory);
  assert.ok(Math.abs(output.hairBack) <= 1);

  output = director.update(0.1, {
    autoBlink: false,
    autoSaccade: false,
    autoRoll: false,
    autoHair: false,
  });
  assert.equal(output.hairFront, 0);
  assert.equal(output.hairBack, 0);
  assert.equal(output.hairAccessory, 0);
});
